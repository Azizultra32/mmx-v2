import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';
import { enforceLaws } from '../core/three-laws.js';
import { initRun, transitionState } from '../state/machine.js';
import { runCathedral } from '../stages/cathedral/cathedral.js';

export async function run(opts: { targetPath: string; level: number }): Promise<void> {
  const enginePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  await enforceLaws({ enginePath, targetPath: opts.targetPath });

  const runId = `mmx-${randomBytes(4).toString('hex')}`;
  console.log(`\n🚀 MMX v2 run: ${runId}`);
  console.log(`Target: ${opts.targetPath}\n`);

  await initRun(opts.targetPath, runId, opts.level);

  console.log('[ CATHEDRAL ] mapping repository...');
  const catResult = await runCathedral({ targetPath: opts.targetPath, runId, level: opts.level });

  if (!catResult.ok) {
    await transitionState(opts.targetPath, runId, 'FAILED', catResult.error);
    console.error(`❌ Cathedral failed: ${catResult.error}`);
    process.exit(1);
  }

  await transitionState(opts.targetPath, runId, 'CATHEDRALED');
  console.log(`✅ Cathedral complete → ${catResult.outputPaths.schematic}`);
  console.log('\n(Stages: Find, Distill, Predict, Propose, Implement, FinalGuard coming next)');
}
