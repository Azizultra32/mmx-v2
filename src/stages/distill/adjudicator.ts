export interface ChallengeVote {
  supports: boolean;
  weakens: boolean;
}

export interface AdjudicatorResult {
  verdict: 'approve' | 'reject' | 'needs_revision';
  confidence: number;
}

export function adjudicate(votes: ChallengeVote[]): AdjudicatorResult {
  const weakens = votes.filter((v) => v.weakens).length;
  const supports = votes.filter((v) => v.supports).length;
  if (weakens >= 4) return { verdict: 'reject', confidence: weakens / votes.length };
  if (supports >= 3) return { verdict: 'approve', confidence: supports / votes.length };
  return { verdict: 'needs_revision', confidence: 0.5 };
}
