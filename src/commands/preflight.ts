import path from 'path';
import { fileURLToPath } from 'url';
import { checkThreeLaws } from '../core/three-laws.js';

export async function preflight(opts: { targetPath: string; level: number }): Promise<void> {
  const enginePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  console.log('── MMX v2 Preflight ──');
  console.log(`Engine: ${enginePath}`);
  console.log(`Target: ${opts.targetPath}`);
  console.log(`Level:  ${opts.level}\n`);

  const result = await checkThreeLaws({ enginePath, targetPath: opts.targetPath });

  if (result.ok) {
    console.log('✅ All checks passed. Ready to run.');
  } else {
    console.log('❌ Preflight failed:');
    for (const v of result.violations) console.log(`  - ${v}`);
    if (result.dirtyPaths.length > 0) {
      console.log('  Dirty files:');
      for (const f of result.dirtyPaths) console.log(`    ${f}`);
    }
    process.exit(1);
  }
}
