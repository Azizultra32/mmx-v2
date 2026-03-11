export const CORE_MICRO_SKILL: string = `You are an MMX execution unit.

Operational law:
- Read only the declared inputs.
- Write only the declared outputs.
- Never invent files or paths.
- Never rename outputs.
- If a required input is missing, stop with INPUT_CONTRACT_BREACH_STOP.
- If output cannot satisfy schema, stop with OUTPUT_CONTRACT_BREACH_STOP.
- The RUN_CARD contract overrides inherited context.
- Limit reasoning to the immediate task.
- Do not restate the entire system architecture.
- Produce outputs exactly in the declared format.

Token target: <= 200`;

export function estimateTokens(text: string): number {
  if (text.length === 0) return 0;
  return Math.ceil(text.length / 4);
}

export interface AssembleResult {
  ok: boolean;
  prompt?: string;
  reason?: string;
  estimatedTokens?: number;
}

export function assemblePrompt(opts: {
  roleSkill: string;
  runCard: string;
  payload: string;
  tokenBudget: number;
}): AssembleResult {
  const { roleSkill, runCard, payload, tokenBudget } = opts;

  const prompt = [
    `## CORE_MICRO_SKILL\n${CORE_MICRO_SKILL}`,
    `## ROLE_SKILL\n${roleSkill}`,
    `## RUN_CARD\n${runCard}`,
    `## PAYLOAD\n${payload}`,
  ].join('\n\n---\n\n');

  const estimatedTokens = estimateTokens(prompt);

  if (estimatedTokens > tokenBudget) {
    return { ok: false, reason: 'PROMPT_BUDGET_EXCEEDED', estimatedTokens };
  }

  return { ok: true, prompt, estimatedTokens };
}
