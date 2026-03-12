import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);

export interface ThreeLawsOptions {
  enginePath: string;
  targetPath: string;
  workspacePath?: string;
}

export class ThreeLawsError extends Error {
  constructor(public readonly law: string, message: string) {
    super(`${law}: ${message}`);
    this.name = 'ThreeLawsError';
  }
}

export async function enforceLaws(options: ThreeLawsOptions): Promise<void> {
  const { enginePath, targetPath, workspacePath } = options;

  const resolvedEngine = path.resolve(enginePath);
  const resolvedTarget = path.resolve(targetPath);

  // Law 1: ENGINE_EQUALS_TARGET
  if (resolvedEngine === resolvedTarget) {
    throw new ThreeLawsError(
      'ENGINE_EQUALS_TARGET',
      `Engine path and target path must not be the same: ${resolvedEngine}`
    );
  }

  // Law 2: WORKSPACE_OUTSIDE_TARGET
  if (workspacePath !== undefined) {
    const resolvedWorkspace = path.resolve(workspacePath);
    const expectedPrefix = path.join(resolvedTarget, '.mmx');
    if (!resolvedWorkspace.startsWith(expectedPrefix)) {
      throw new ThreeLawsError(
        'WORKSPACE_OUTSIDE_TARGET',
        `Workspace path must be inside <targetPath>/.mmx. Got: ${resolvedWorkspace}, expected prefix: ${expectedPrefix}`
      );
    }
  }

  // Law 3: TARGET_DIRTY
  try {
    const { stdout } = await execFileAsync('git', ['-C', resolvedTarget, 'status', '--porcelain']);
    const dirtyLines = stdout
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .filter((line) => !line.includes('.mmx'));

    if (dirtyLines.length > 0) {
      throw new ThreeLawsError(
        'TARGET_DIRTY',
        `Target repo has dirty tracked files:\n${dirtyLines.join('\n')}`
      );
    }
  } catch (err) {
    // If it's our own ThreeLawsError, rethrow
    if (err instanceof ThreeLawsError) {
      throw err;
    }
    // If git is not available or target is not a git repo, skip silently
    // (execFile throws when exit code != 0 or command not found)
  }
}
