import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { checkThreeLaws } from '../core/three-laws.js';
import { runsDir } from '../state/paths.js';
import { readRunState } from '../state/machine.js';
import type { InvestigationState } from '../core/types.js';

const __file = fileURLToPath(import.meta.url);
const __dir = path.dirname(__file);
const STATIC = path.resolve(__dir, '../../dashboard/dist');

export async function startDashboard(opts: { targetPath: string; port?: number }): Promise<void> {
  const port = opts.port ?? 4242;
  const enginePath = path.resolve(__dir, '../..');
  const targetName = path.basename(opts.targetPath);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (url.pathname === '/api/compliance') {
      const result = await checkThreeLaws({ enginePath, targetPath: opts.targetPath });
      json(res, 200, { enginePath, targetPath: opts.targetPath, targetName, ...result });

    } else if (url.pathname === '/api/runs') {
      const runIds = await listRuns(opts.targetPath);
      const runs = await Promise.all(
        runIds.map(async (id) => {
          const state = await readRunState(opts.targetPath, id);
          return state ?? { runId: id, state: 'UNKNOWN', level: 0, totalCostUsd: 0 };
        }),
      );
      json(res, 200, { runs, targetName });

    } else if (url.pathname === '/api/run' && req.method === 'POST') {
      const check = await checkThreeLaws({ enginePath, targetPath: opts.targetPath });
      if (!check.ok) {
        json(res, 400, { ok: false, violations: check.violations, dirtyPaths: check.dirtyPaths });
        return;
      }
      const { spawn } = await import('child_process');
      const cli = path.resolve(__dir, '../../dist/cli.js');
      // Use spawn with array args — safe, no shell injection
      const child = spawn(process.execPath, [cli, 'run', '--repo', opts.targetPath], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      json(res, 200, { ok: true, pid: child.pid });

    } else {
      await serveStatic(res, url.pathname, STATIC);
    }
  });

  server.listen(port, () => {
    console.log(`\n  MMX v2 Dashboard → http://localhost:${port}\n`);
    console.log(`  Target: ${targetName} (${opts.targetPath})\n`);
  });
}

function json(res: http.ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

async function listRuns(targetPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(runsDir(targetPath), { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name).reverse();
  } catch { return []; }
}

async function serveStatic(res: http.ServerResponse, pathname: string, staticDir: string): Promise<void> {
  const MIME: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };
  let filePath = path.join(staticDir, pathname === '/' ? 'index.html' : pathname);
  try { await fs.access(filePath); } catch { filePath = path.join(staticDir, 'index.html'); }
  try {
    const content = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] ?? 'text/plain' });
    res.end(content);
  } catch { res.writeHead(404); res.end('Not found'); }
}
