import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFile = promisify(execFileCb);

export type ThreeLawsViolation =
  | 'ENGINE_EQUALS_TARGET'
  | 'TARGET_DIRTY'
  | 'WORKSPACE_OUTSIDE_TARGET';

export interface ThreeLawsResult {
  ok: boolean;
  violations: ThreeLawsViolation[];
  dirtyPaths: string[];
}

export class ThreeLawsError extends Error {
  constructor(public violations: ThreeLawsViolation[], public dirtyPaths: string[]) {
    super(`Three Laws violated: ${violations.join(', ')}`);
  }
}

export async function checkThreeLaws(opts: {
  enginePath: string;
  targetPath: string;
  workspacePath?: string;
}): Promise<ThreeLawsResult> {
  const violations: ThreeLawsViolation[] = [];
  const dirtyPaths: string[] = [];

  if (path.resolve(opts.enginePath) === path.resolve(opts.targetPath)) {
    violations.push('ENGINE_EQUALS_TARGET');
  }

  try {
    const { stdout } = await execFile('git', ['status', '--porcelain'], {
      cwd: opts.targetPath,
    });
    for (const line of stdout.split('\n')) {
      const file = line.slice(3).trim();
      if (file && !file.startsWith('.metamatrix')) {
        dirtyPaths.push(file);
      }
    }
    if (dirtyPaths.length > 0) violations.push('TARGET_DIRTY');
  } catch {
    // not a git repo — skip
  }

  if (opts.workspacePath) {
    if (!path.resolve(opts.workspacePath).startsWith(path.resolve(opts.targetPath))) {
      violations.push('WORKSPACE_OUTSIDE_TARGET');
    }
  }

  return { ok: violations.length === 0, violations, dirtyPaths };
}

export async function enforceLaws(opts: {
  enginePath: string;
  targetPath: string;
  workspacePath?: string;
}): Promise<void> {
  const result = await checkThreeLaws(opts);
  if (!result.ok) throw new ThreeLawsError(result.violations, result.dirtyPaths);
}
