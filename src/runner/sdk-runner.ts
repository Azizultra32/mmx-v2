import type { RunCard } from '../core/types.js';

export const COMPLETION_SIGNAL = 'AUTONOMOUS_COMPLETE';

export interface RunnerOptions {
  model: string;
  system: string;
  maxTurns: number;
  // NO apiKey — Max subscription authenticates via Claude Code CLI automatically
}

export function buildRunnerOptions(opts: {
  model: string;
  systemPrompt: string;
  maxTurns: number;
}): RunnerOptions {
  return {
    model: opts.model,
    system: `${opts.systemPrompt}\n\nWhen your task is complete, output "${COMPLETION_SIGNAL}" on its own line.`,
    maxTurns: opts.maxTurns,
  };
}

export interface RunnerResult {
  ok: boolean;
  output: string;
  completed: boolean;
  costUsd: number;
  error?: string;
}

export async function runWithSDK(opts: {
  runCard: RunCard;
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  maxTurns?: number;
  onOutput?: (text: string) => void;
}): Promise<RunnerResult> {
  const { query } = await import('@anthropic-ai/claude-agent-sdk');
  const runnerOpts = buildRunnerOptions({
    model: opts.model ?? 'claude-opus-4-6',
    systemPrompt: opts.systemPrompt,
    maxTurns: opts.maxTurns ?? 20,
  });

  const outputParts: string[] = [];
  let completed = false;
  let costUsd = 0;

  try {
    // No apiKey — SDK uses Claude Code Max subscription credentials automatically
    const stream = query({
      prompt: opts.userPrompt,
      options: {
        model: runnerOpts.model,
        systemPrompt: runnerOpts.system,
        maxTurns: runnerOpts.maxTurns,
      },
    });

    for await (const event of stream) {
      if (event.type === 'assistant') {
        for (const block of event.message.content) {
          if (block.type === 'text') {
            outputParts.push(block.text);
            opts.onOutput?.(block.text);
            if (block.text.includes(COMPLETION_SIGNAL)) completed = true;
          }
        }
      }
    }
    return { ok: true, output: outputParts.join(''), completed, costUsd };
  } catch (err) {
    return {
      ok: false,
      output: outputParts.join(''),
      completed: false,
      costUsd,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
