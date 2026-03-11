import { parseArgs } from 'util';

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    repo: { type: 'string' },
    level: { type: 'string', default: '1' },
    port: { type: 'string', default: '4242' },
  },
  allowPositionals: true,
});

const command = positionals[0];
const targetPath = values.repo;

if (!targetPath) {
  console.error('Error: --repo <path> is required');
  console.error('Usage: mmx-v2 <preflight|run|dashboard> --repo <path> [--level <n>] [--port <n>]');
  process.exit(1);
}

const level = parseInt(values.level ?? '1', 10);
const port = parseInt(values.port ?? '4242', 10);

if (command === 'preflight') {
  const { preflight } = await import('./commands/preflight.js');
  await preflight({ targetPath, level });
} else if (command === 'run') {
  const { run } = await import('./commands/run.js');
  await run({ targetPath, level });
} else if (command === 'dashboard') {
  const { startDashboard } = await import('./commands/dashboard.js');
  await startDashboard({ targetPath, port });
} else {
  console.error(`Unknown command: ${command ?? '(none)'}`);
  console.error('Usage: mmx-v2 <preflight|run|dashboard> --repo <path>');
  process.exit(1);
}
