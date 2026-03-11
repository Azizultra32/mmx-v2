import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Paths } from '../core/paths.js';
import { RunRegistry, type RunState } from '../state/machine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_DIST = path.resolve(__dirname, '../../dashboard/dist');

export interface DashboardOpts {
  targetPath: string;
  port?: number;
}

// ─── SSE helpers ────────────────────────────────────────────────────────────

function setSseHeaders(res: http.ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
}

function sendSseData(res: http.ServerResponse, data: unknown): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// ─── Run registry helpers ────────────────────────────────────────────────────

async function listAllRuns(targetPath: string): Promise<RunState[]> {
  const runsDir = path.join(targetPath, '.metamatrix', 'runs');
  try {
    const entries = await fsp.readdir(runsDir);
    const runs: RunState[] = [];
    for (const runId of entries) {
      try {
        const reg = new RunRegistry(targetPath, runId);
        const state = await reg.read();
        runs.push(state);
      } catch {
        // skip corrupt entries
      }
    }
    return runs.sort((a, b) => b.created_at.localeCompare(a.created_at));
  } catch {
    return [];
  }
}

async function getRunById(targetPath: string, runId: string): Promise<RunState | null> {
  try {
    const reg = new RunRegistry(targetPath, runId);
    return await reg.read();
  } catch {
    return null;
  }
}

// ─── Static file serving ─────────────────────────────────────────────────────

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

async function serveStatic(res: http.ServerResponse, filePath: string): Promise<void> {
  try {
    const data = await fsp.readFile(filePath);
    const ext = path.extname(filePath);
    const mime = MIME[ext] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

// ─── Core builder ────────────────────────────────────────────────────────────

export function buildDashboardServer(opts: { targetPath: string; port?: number }): http.Server {
  const { targetPath } = opts;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost`);
    const pathname = url.pathname;
    const method = req.method ?? 'GET';

    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    // ── GET /api/events?runId=X ─────────────────────────────────────────────
    if (method === 'GET' && pathname === '/api/events') {
      const runId = url.searchParams.get('runId');
      if (!runId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'runId required' }));
        return;
      }

      const paths = new Paths(targetPath, runId);
      const activityFile = paths.events.activity;

      setSseHeaders(res);

      let fileOffset = 0;
      let closed = false;

      const poll = () => {
        if (closed) return;
        try {
          const stat = fs.statSync(activityFile);
          if (stat.size > fileOffset) {
            const fd = fs.openSync(activityFile, 'r');
            const buf = Buffer.alloc(stat.size - fileOffset);
            fs.readSync(fd, buf, 0, buf.length, fileOffset);
            fs.closeSync(fd);
            fileOffset = stat.size;

            const lines = buf.toString('utf8').split('\n').filter(l => l.trim());
            for (const line of lines) {
              try {
                const event = JSON.parse(line);
                sendSseData(res, event);
              } catch {
                // skip malformed lines
              }
            }
          }
        } catch {
          // file not yet created — that's fine
        }
        if (!closed) setTimeout(poll, 500);
      };

      req.on('close', () => { closed = true; });
      poll();
      return;
    }

    // ── GET /api/runs ───────────────────────────────────────────────────────
    if (method === 'GET' && pathname === '/api/runs') {
      listAllRuns(targetPath).then(runs => {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify({ runs }));
      }).catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      });
      return;
    }

    // ── GET /api/run/:runId ─────────────────────────────────────────────────
    const runMatch = pathname.match(/^\/api\/run\/([^/]+)$/);
    if (method === 'GET' && runMatch) {
      const runId = runMatch[1];
      getRunById(targetPath, runId).then(state => {
        if (!state) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'run not found' }));
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify(state));
      }).catch(err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      });
      return;
    }

    // ── POST /api/run ───────────────────────────────────────────────────────
    if (method === 'POST' && pathname === '/api/run') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        let parsed: Record<string, unknown> = {};
        try { parsed = JSON.parse(body); } catch { /* ignore */ }

        const level = String(parsed.level ?? '1');
        const cliPath = path.resolve(__dirname, '../../dist/cli.js');

        execFile('node', [cliPath, 'run', targetPath, '--level', level], (err) => {
          if (err) {
            // Non-zero exit is not necessarily fatal for spawning — run started
          }
        });

        // Return immediately with optimistic runId derived from timestamp
        const runId = `run-${Date.now()}`;
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify({ ok: true, runId }));
      });
      return;
    }

    // ── GET / or /index.html ────────────────────────────────────────────────
    if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      const indexPath = path.join(DASHBOARD_DIST, 'index.html');
      if (fs.existsSync(indexPath)) {
        serveStatic(res, indexPath);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(
          'Dashboard not built. Run: cd dashboard && npm run build\n',
        );
      }
      return;
    }

    // ── GET /assets/* ───────────────────────────────────────────────────────
    if (method === 'GET' && pathname.startsWith('/assets/')) {
      const filePath = path.join(DASHBOARD_DIST, pathname);
      serveStatic(res, filePath);
      return;
    }

    // ── 404 fallback ────────────────────────────────────────────────────────
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });

  return server;
}

export async function startDashboard(opts: { targetPath: string; port?: number }): Promise<http.Server> {
  const port = opts.port ?? 4242;
  const server = buildDashboardServer(opts);

  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      console.log(`MMX dashboard running at http://localhost:${port}`);
      resolve();
    });
  });

  return server;
}
