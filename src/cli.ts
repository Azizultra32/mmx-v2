#!/usr/bin/env node
import { run } from './commands/run.js';
import { preflight } from './commands/preflight.js';

const args = process.argv.slice(2);
const command = args[0];

function parseFlag(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1) return undefined;
  return args[idx + 1];
}

function hasFlag(flag: string): boolean {
  return args.includes(flag);
}

async function main(): Promise<void> {
  switch (command) {
    case 'run': {
      const targetPath = args[1];
      if (!targetPath) {
        console.error('Usage: mmx-v2 run <targetPath> [--level N] [--dry-run]');
        process.exit(1);
      }
      const levelStr = parseFlag('--level');
      const level = levelStr ? parseInt(levelStr, 10) : 1;
      const dryRun = hasFlag('--dry-run');
      const focus = parseFlag('--focus');
      await run({ targetPath, level, dryRun, focus });
      break;
    }

    case 'preflight': {
      const targetPath = args[1];
      if (!targetPath) {
        console.error('Usage: mmx-v2 preflight <targetPath>');
        process.exit(1);
      }
      await preflight({ targetPath });
      break;
    }

    case 'dashboard': {
      const targetPath = parseFlag('--repo');
      const portStr = parseFlag('--port');
      const port = portStr ? parseInt(portStr, 10) : 4242;
      if (!targetPath) {
        console.error('Usage: mmx-v2 dashboard --repo <targetPath> [--port 4242]');
        process.exit(1);
      }
      const { startDashboard } = await import('./commands/dashboard.js');
      startDashboard({ targetPath, port });
      break;
    }

    default: {
      console.log('MMX v2 — Contract-driven multi-agent orchestration engine');
      console.log('');
      console.log('Usage:');
      console.log('  mmx-v2 run <targetPath> --level 1 [--dry-run] [--focus "topic"]');
      console.log('  mmx-v2 preflight <targetPath>');
      console.log('  mmx-v2 dashboard --repo <targetPath> [--port 4242]');
      process.exit(command ? 1 : 0);
    }
  }
}

main().catch((err) => {
  console.error('[MMX] Fatal error:', err);
  process.exit(1);
});
