// src/scaffold/demo-sandbox.ts
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';

const execFile = promisify(execFileCb);

const SANDBOX_FILES: Record<string, string> = {
  'package.json': JSON.stringify({
    name: 'mmx-sandbox',
    version: '1.0.0',
    type: 'module',
    scripts: { build: 'tsc', test: 'node --experimental-vm-modules node_modules/.bin/jest' },
    dependencies: {},
    devDependencies: { typescript: '^5.0.0' }
  }, null, 2),

  'tsconfig.json': JSON.stringify({
    compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: false, outDir: 'dist' },
    include: ['src/**/*']
  }, null, 2),

  'src/auth.ts': `// Authentication module
export function authenticate(username: string, password: string): boolean {
  // BUG: hardcoded credentials, no hashing
  if (username === 'admin' && password === 'password123') return true;
  return false;
}

export function generateToken(userId: string): string {
  // BUG: predictable token, not cryptographically secure
  return userId + '_' + Date.now().toString();
}

export function parseToken(token: string): { userId: string } | null {
  // BUG: no validation, no expiry check
  const parts = token.split('_');
  return { userId: parts[0] };
}
`,

  'src/database.ts': `// Database access layer
import fs from 'fs';

let connection: any = null;

export function query(sql: string, params: any[]): any {
  // BUG: SQL injection — params concatenated directly into string
  const finalSql = sql.replace(/\\?/g, () => params.shift());
  console.log('Executing:', finalSql);
  // simulate result
  return [];
}

export function getUser(id: string): any {
  // BUG: unvalidated input passed to query
  return query('SELECT * FROM users WHERE id = ' + id, []);
}

export function updateUser(id: string, data: Record<string, any>): void {
  // BUG: no input sanitization, spreads all user-provided fields
  const fields = Object.keys(data).map(k => k + '=' + data[k]).join(', ');
  query('UPDATE users SET ' + fields + ' WHERE id = ?', [id]);
}
`,

  'src/cache.ts': `// In-memory cache
const cache: Map<string, { value: any; expiresAt: number }> = new Map();

export function set(key: string, value: any, ttlMs: number): void {
  // BUG: no size limit — unbounded memory growth
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function get(key: string): any {
  const entry = cache.get(key);
  // BUG: returns stale data — checks expiry but never cleans up
  if (!entry) return null;
  return entry.value; // missing expiry check
}

export function invalidate(prefix: string): void {
  // BUG: race condition — iterating while potentially mutating
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
`,

  'src/api.ts': `// HTTP API handler
import { query } from './database.js';
import { parseToken } from './auth.js';

export async function handleRequest(req: any, res: any): Promise<void> {
  const token = req.headers['authorization']?.split(' ')[1];

  // BUG: no token validation before use
  const user = parseToken(token);

  if (req.url === '/api/users') {
    // BUG: returns all users without pagination or access control
    const users = query('SELECT * FROM users', []);
    res.json(users);
  }

  if (req.url.startsWith('/api/user/')) {
    // BUG: path traversal — extracts id from URL without sanitization
    const id = req.url.split('/').pop();
    const userData = query('SELECT * FROM users WHERE id = ' + id, []);
    // BUG: null dereference — user may be null
    res.json({ ...userData[0], requestedBy: user.userId });
  }
}
`,

  'src/worker.ts': `// Background job processor
const jobs: Array<{ id: string; fn: () => Promise<void> }> = [];
let running = false;

export function enqueue(fn: () => Promise<void>): string {
  const id = Math.random().toString(36).slice(2);
  jobs.push({ id, fn });
  // BUG: fire and forget — no await, errors silently swallowed
  if (!running) processNext();
  return id;
}

async function processNext(): Promise<void> {
  running = true;
  // BUG: race condition — multiple callers could set running = true simultaneously
  while (jobs.length > 0) {
    const job = jobs.shift()!;
    try {
      await job.fn();
    } catch {
      // BUG: errors silently swallowed, no retry, no dead-letter queue
    }
  }
  running = false;
}

export function getQueueDepth(): number {
  return jobs.length;
}
`,

  'src/index.ts': `// Entry point
export { authenticate, generateToken } from './auth.js';
export { query, getUser } from './database.js';
export { set as cacheSet, get as cacheGet } from './cache.js';
export { enqueue } from './worker.js';
export { handleRequest } from './api.js';
`
};

export interface SandboxResult {
  targetPath: string;
  targetId: string;
  displayName: string;
  fileCount: number;
}

export async function createDemoSandbox(opts?: { basePath?: string }): Promise<SandboxResult> {
  const sandboxPath = opts?.basePath ?? path.join(process.env['HOME'] ?? '/tmp', 'mmx-sandbox');

  // Create directory structure
  await fs.mkdir(path.join(sandboxPath, 'src'), { recursive: true });

  // Write all files
  for (const [filePath, content] of Object.entries(SANDBOX_FILES)) {
    const fullPath = path.join(sandboxPath, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf8');
  }

  // Git init + configure + commit (use execFile, no shell injection)
  try {
    await execFile('git', ['init'], { cwd: sandboxPath });
    await execFile('git', ['config', 'user.email', 'mmx@sandbox.local'], { cwd: sandboxPath });
    await execFile('git', ['config', 'user.name', 'MMX Sandbox'], { cwd: sandboxPath });
    await execFile('git', ['add', '.'], { cwd: sandboxPath });
    await execFile('git', ['commit', '-m', 'feat: initial sandbox — 5 modules with intentional bugs'], { cwd: sandboxPath });
  } catch {
    // git may already be initialized — that's ok
  }

  // Write .mmx/target.json
  const mmxDir = path.join(sandboxPath, '.mmx');
  await fs.mkdir(mmxDir, { recursive: true });

  const targetId = `target-${randomBytes(4).toString('hex')}`;
  const targetJson = {
    target_id: targetId,
    display_name: 'Demo Sandbox',
    source_type: 'demo' as const,
    source_path: sandboxPath,
    created_at: new Date().toISOString(),
    engine_version: '2.0.0',
  };

  await fs.writeFile(path.join(mmxDir, 'target.json'), JSON.stringify(targetJson, null, 2), 'utf8');

  // Write .gitignore to exclude .mmx from the target's git
  await fs.writeFile(path.join(sandboxPath, '.gitignore'), '.mmx/\nnode_modules/\ndist/\n', 'utf8');
  await execFile('git', ['add', '.gitignore'], { cwd: sandboxPath }).catch(() => {});
  await execFile('git', ['commit', '-m', 'chore: add .gitignore (exclude .mmx workspace)'], { cwd: sandboxPath }).catch(() => {});

  return {
    targetPath: sandboxPath,
    targetId,
    displayName: 'Demo Sandbox',
    fileCount: Object.keys(SANDBOX_FILES).length,
  };
}
