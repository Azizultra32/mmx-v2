import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { StageResult } from '../../core/types.js';
import { createRunCard } from '../../core/run-card.js';
import { stageDir } from '../../state/paths.js';
import { runWithSDK } from '../../runner/sdk-runner.js';

const PROMPT_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../prompts/roles/cathedral.md',
);

export async function runCathedral(opts: {
  targetPath: string;
  runId: string;
  level: number;
  dryRun?: boolean;
}): Promise<StageResult> {
  const workspace = path.join(opts.targetPath, '.metamatrix');
  const outputDir = stageDir(opts.targetPath, opts.runId, 'cathedral');
  await fs.mkdir(outputDir, { recursive: true });

  const schemPath = path.join(outputDir, 'cathedral-schematic.json');

  if (opts.dryRun) {
    const stub = {
      repo: opts.targetPath,
      language: 'unknown',
      framework: null,
      entryPoints: [],
      modules: [],
      dependencies: {},
      estimatedLoc: 0,
      mappedAt: new Date().toISOString(),
    };
    await fs.writeFile(schemPath, JSON.stringify(stub, null, 2));
    return {
      ok: true,
      runId: opts.runId,
      stage: 'cathedral',
      outputPaths: { schematic: schemPath },
      costUsd: 0,
    };
  }

  const systemPrompt = await fs.readFile(PROMPT_PATH, 'utf-8').catch(
    () => 'Map the repository structure and output AUTONOMOUS_COMPLETE when done.',
  );

  const userPrompt = `Target repository: ${opts.targetPath}\n\nWrite your schematic to: ${schemPath}`;

  const result = await runWithSDK({
    runCard: createRunCard({
      targetPath: opts.targetPath,
      workspacePath: workspace,
      stage: 'cathedral',
      level: opts.level,
      budgetUsd: 1.0,
    }),
    systemPrompt,
    userPrompt,
    model: 'claude-sonnet-4-6',
    maxTurns: 15,
    onOutput: (t) => process.stdout.write(t),
  });

  return {
    ok: result.ok && result.completed,
    runId: opts.runId,
    stage: 'cathedral',
    outputPaths: { schematic: schemPath },
    costUsd: result.costUsd,
    error: result.error,
  };
}
