import type { RunCard, RunnerResult } from '../core/types.js';

export const COMPLETION_SIGNAL = 'AUTONOMOUS_COMPLETE';
export const DEFAULT_MODEL = 'claude-opus-4-6';

// Pricing for claude-opus-4-6
const INPUT_PRICE_PER_TOKEN = 15 / 1_000_000;   // $15 per million input tokens
const OUTPUT_PRICE_PER_TOKEN = 75 / 1_000_000;  // $75 per million output tokens

/**
 * Builds SDK options without apiKey.
 * Authentication happens automatically through the Claude Code Max subscription CLI session.
 */
export function buildPromptOptions(opts: {
  model: string;
  systemPrompt: string;
  maxTurns: number;
}): {
  model: string;
  systemPrompt: string;
  maxTurns: number;
} {
  return {
    model: opts.model,
    systemPrompt:
      opts.systemPrompt +
      `\n\nWhen your task is complete, output "${COMPLETION_SIGNAL}" on its own line.`,
    maxTurns: opts.maxTurns,
  };
}

/**
 * Runs a stage via the Agent SDK.
 * Uses dynamic import of @anthropic-ai/claude-agent-sdk with NO apiKey.
 */
export async function runWithSDK(opts: {
  runCard: RunCard;
  assembledPrompt: string;  // the 4-block envelope systemPrompt
  payload: string;           // user prompt / payload
  onOutput?: (text: string) => void;
  cwd?: string;              // working directory for the agent subprocess (should be targetPath)
}): Promise<RunnerResult> {
  try {
    const { query } = await import('@anthropic-ai/claude-agent-sdk');

    const maxTurns = opts.runCard.thread.max_turns ?? 20;
    const promptOpts = buildPromptOptions({
      model: DEFAULT_MODEL,
      systemPrompt: opts.assembledPrompt,
      maxTurns,
    });

    const queryResult = query({
      prompt: opts.payload,
      options: {
        model: promptOpts.model,
        systemPrompt: promptOpts.systemPrompt,
        maxTurns: promptOpts.maxTurns,
        // Set cwd to target path so the agent subprocess reads the right repo
        // and has write access to its .mmx workspace.
        ...(opts.cwd ? { cwd: opts.cwd } : {}),
        // The agent must write to .mmx/ workspace (gitignored). Bypass
        // permission prompts so it can write output artifacts without blocking.
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
      },
    });

    let output = '';
    let completed = false;
    let costUsd = 0;

    for await (const event of queryResult) {
      if (event.type === 'assistant') {
        // Collect text blocks from assistant messages
        const message = event.message;
        for (const block of message.content) {
          if (block.type === 'text') {
            output += block.text;
            if (opts.onOutput) {
              opts.onOutput(block.text);
            }
            if (block.text.includes(COMPLETION_SIGNAL)) {
              completed = true;
            }
          }
        }
      } else if (event.type === 'result') {
        // Extract cost from the result message
        if ('total_cost_usd' in event && typeof event.total_cost_usd === 'number') {
          costUsd = event.total_cost_usd;
        } else if ('usage' in event && event.usage) {
          // Fallback: compute from token counts
          const usage = event.usage as { input_tokens?: number; output_tokens?: number };
          const inputTokens = usage.input_tokens ?? 0;
          const outputTokens = usage.output_tokens ?? 0;
          costUsd = inputTokens * INPUT_PRICE_PER_TOKEN + outputTokens * OUTPUT_PRICE_PER_TOKEN;
        }
      }
    }

    return {
      ok: true,
      output,
      completed,
      costUsd,
    };
  } catch (err) {
    return {
      ok: false,
      output: '',
      completed: false,
      costUsd: 0,
      error: String(err),
    };
  }
}
