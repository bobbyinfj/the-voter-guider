import type { NextQuestionResult, OfficeResult, ScoringQuestion } from "./types";

interface NextQuestionInput {
  questions: ScoringQuestion[];
  answeredQuestionIds: Set<string>;
  officeResults: OfficeResult[]; // current partial results
}

/**
 * Picks the next question that maximises discrimination across still-uncertain offices.
 *
 * Gain heuristic per question:
 *   gain(q) = Σ_office [ stanceVariance(office, q) * (1 - confidence(office)) ]
 *
 * stanceVariance = variance of candidate stances on issues touched by q,
 * weighted by the question's per-issue weight.
 */
export function pickNextQuestion(input: NextQuestionInput): NextQuestionResult {
  const { questions, answeredQuestionIds, officeResults } = input;

  const unanswered = questions.filter((q) => !answeredQuestionIds.has(q.id));
  if (unanswered.length === 0) return { questionId: null, reason: "exhausted" };

  // Build lookup: officeId → { confidence, candidates: [{stances}] }
  const officeData = officeResults.map((o) => ({
    confidence: o.confidence,
    candidateStances: o.rankedCandidates.map((rc) => rc.candidate.stances),
  }));

  if (officeData.length === 0) {
    // No results yet — fall back to author order
    const first = unanswered.sort((a, b) => a.order - b.order)[0];
    return { questionId: first.id, reason: "ordered" };
  }

  let best: ScoringQuestion | null = null;
  let bestGain = -Infinity;

  for (const q of unanswered) {
    let gain = 0;
    for (const office of officeData) {
      if (office.confidence >= 0.95) continue; // already confident — skip
      const uncertainty = 1 - office.confidence;
      const variance = computeStanceVariance(office.candidateStances, q);
      gain += variance * uncertainty;
    }

    if (gain > bestGain) {
      bestGain = gain;
      best = q;
    }
  }

  if (!best || bestGain === 0) {
    // All tied or no stance data — use author order
    const ordered = unanswered.sort((a, b) => a.order - b.order)[0];
    return { questionId: ordered.id, reason: "ordered" };
  }

  return { questionId: best.id, reason: "adaptive" };
}

function computeStanceVariance(
  candidateStances: Array<Array<{ issueId: string; position: number }>>,
  q: ScoringQuestion,
): number {
  if (candidateStances.length < 2 || q.issues.length === 0) return 0;

  let totalVariance = 0;

  for (const { issueId, weight } of q.issues) {
    const positions = candidateStances
      .map((stances) => stances.find((s) => s.issueId === issueId)?.position)
      .filter((p): p is number => p !== undefined);

    if (positions.length < 2) continue;

    const mean = positions.reduce((s, p) => s + p, 0) / positions.length;
    const variance =
      positions.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / positions.length;
    totalVariance += variance * weight;
  }

  return totalVariance;
}
