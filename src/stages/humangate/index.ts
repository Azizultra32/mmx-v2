import fs from 'fs/promises';
import path from 'path';
import { Paths } from '../../core/paths.js';
import { StageResult } from '../../core/types.js';
import { EventSpine } from '../../enforcement/events.js';

async function getFid8sFromFinalGuard(paths: Paths): Promise<string[]> {
  const verdictDir = path.dirname(paths.finalguard.verdict('x'));
  try {
    const files = await fs.readdir(verdictDir);
    return files
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''));
  } catch {
    return [];
  }
}

export async function runHumanGate(opts: {
  targetPath: string;
  runId: string;
  dryRun?: boolean;
}): Promise<StageResult> {
  const { targetPath, runId, dryRun } = opts;
  const paths = new Paths(targetPath, runId);
  const spine = new EventSpine(paths.events.activity);

  await spine.emit({
    event_type: 'DISPATCH_STARTED',
    run_id: runId,
    agent_id: `humangate-${runId}`,
    stage: 'humangate',
    role: null,
  });

  const fid8s = await getFid8sFromFinalGuard(paths);

  if (fid8s.length === 0) {
    return {
      ok: false,
      runId,
      stage: 'humangate',
      outputPaths: {},
      costUsd: 0,
      error: 'INPUT_VALIDATION_FAILED: no finalguard verdict files found',
    };
  }

  const outputPaths: Record<string, string> = {};

  for (const fid8 of fid8s) {
    const packetPath = paths.humangate.packet(fid8);
    await fs.mkdir(path.dirname(packetPath), { recursive: true });

    // Read the finalguard verdict to include in the human packet
    let verdictData: unknown = null;
    try {
      const raw = await fs.readFile(paths.finalguard.verdict(fid8), 'utf-8');
      verdictData = JSON.parse(raw);
    } catch {
      // If verdict not readable, still create a basic packet
    }

    await fs.writeFile(
      packetPath,
      JSON.stringify(
        {
          fid8,
          run_id: runId,
          stage: 'humangate',
          packet_type: 'human_review_packet',
          status: 'awaiting_human',
          finalguard_verdict: verdictData,
          created_at: new Date().toISOString(),
          // Human must explicitly approve/reject — no auto-approval in dryRun
          human_decision: null,
        },
        null,
        2,
      ),
      'utf-8',
    );

    outputPaths[`packet_${fid8}`] = packetPath;
  }

  await spine.emit({
    event_type: 'HUMAN_PACKET_CREATED',
    run_id: runId,
    agent_id: `humangate-${runId}`,
    stage: 'humangate',
    role: null,
    status: 'awaiting_human',
  });

  // Do NOT auto-approve — stop and await human decision
  return {
    ok: true,
    runId,
    stage: 'humangate',
    outputPaths,
    costUsd: 0,
  };
}
