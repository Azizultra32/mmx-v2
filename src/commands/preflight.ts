import { enforceLaws, ThreeLawsError } from '../core/three-laws.js';

export interface PreflightOptions {
  targetPath: string;
}

export async function preflight(opts: PreflightOptions): Promise<void> {
  const { targetPath } = opts;

  console.log(`[MMX Preflight] Checking target: ${targetPath}`);

  try {
    await enforceLaws({
      enginePath: process.cwd(),
      targetPath,
    });
    console.log('[MMX Preflight] PASS — Three Laws check passed.');
    console.log('[MMX Preflight] Target is safe to process.');
  } catch (err) {
    if (err instanceof ThreeLawsError) {
      console.error(`[MMX Preflight] FAIL — Law violation: ${err.law}`);
      console.error(`[MMX Preflight] ${err.message}`);
    } else {
      console.error(`[MMX Preflight] FAIL — Unexpected error: ${String(err)}`);
    }
    process.exit(1);
  }
}
