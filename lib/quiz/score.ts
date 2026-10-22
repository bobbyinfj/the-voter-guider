import type {
  ContributionItem,
  OfficeResult,
  QuizResults,
  RankedCandidate,
  ScoringAnswer,
  ScoringCandidate,
  ScoringQuestion,
} from "./types";

interface ScoringInput {
  candidates: ScoringCandidate[]; // all candidates across all offices
  questions: ScoringQuestion[];
  answers: ScoringAnswer[];
  issueNames: Record<string, string>; // issueId → display name
  officeInfo: Record<string, { title: string }>; // officeId → metadata
  totalQuestions: number;
}

export function scoreQuiz(input: ScoringInput): QuizResults {
  const { candidates, questions, answers, issueNames, officeInfo, totalQuestions } = input;

  const answerMap = new Map(answers.map((a) => [a.questionId, a]));
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  // Group candidates by office
  const byOffice = new Map<string, ScoringCandidate[]>();
  for (const c of candidates) {
    const list = byOffice.get(c.officeId) ?? [];
    list.push(c);
    byOffice.set(c.officeId, list);
  }

  const officeResults: OfficeResult[] = [];

  for (const [officeId, officeCandidates] of byOffice) {
    // Races with no researched positions can't be matched — leave them out of results
    if (officeCandidates.every((c) => c.stances.length === 0)) continue;

    // Answered questions on which a candidate has a sourced position
    const answered = [...answerMap.values()].filter((a) => questionMap.has(a.questionId) && a.importance > 0);
    const stanceOn = (c: ScoringCandidate, questionId: string) => {
      const q = questionMap.get(questionId)!;
      return q.issues.map((i) => ({ ...i, stance: c.stances.find((s) => s.issueId === i.issueId) })).filter((i) => i.stance);
    };
    // Candidates are only compared on questions where every one of them has a sourced position:
    // otherwise someone with a single lucky agreement could outrank someone judged on more
    const shared = answered.filter((a) => officeCandidates.every((c) => stanceOn(c, a.questionId).length > 0));
    const sharedIds = new Set(shared.map((a) => a.questionId));

    const rankedCandidates: RankedCandidate[] = officeCandidates.map((candidate) => {
      let score = 0;
      let maxPossible = 0;
      let known = 0;
      const breakdown: ContributionItem[] = [];

      for (const answer of answered) {
        const question = questionMap.get(answer.questionId)!;
        const stances = stanceOn(candidate, answer.questionId);
        if (stances.length) known++;
        const counts = sharedIds.has(answer.questionId);
        for (const { issueId, weight, stance } of stances) {
          const agreement = 4 - Math.abs(answer.stanceValue - stance!.position);
          const contribution = agreement * weight * answer.importance;
          if (counts) {
            score += contribution;
            maxPossible += 4 * weight * answer.importance;
          }
          breakdown.push({
            questionId: answer.questionId,
            questionPrompt: question.prompt,
            issueId,
            issueName: issueNames[issueId] ?? issueId,
            candidateStance: stance!.position,
            userStance: answer.stanceValue,
            qWeight: weight,
            importance: answer.importance,
            agreement,
            contribution: counts ? contribution : 0,
            counted: counts,
          });
        }
      }

      const normalized = maxPossible > 0 ? score / maxPossible : 0;
      return { candidate, score, maxPossible, normalized, known, breakdown };
    });

    rankedCandidates.sort((a, b) => b.normalized - a.normalized || b.known - a.known);

    const verdict = verdictFor(rankedCandidates, shared.length);
    const confidence = verdict === "not-enough" ? 0 : computeConfidence(rankedCandidates, shared.length);
    officeResults.push({
      officeId,
      officeTitle: officeInfo[officeId]?.title ?? officeId,
      rankedCandidates,
      confidence,
      comparable: verdict !== "not-enough",
      verdict,
      sharedQuestions: shared.length,
    });
  }

  const questionsAnswered = answers.length;
  const overallConfidence =
    officeResults.length > 0
      ? officeResults.reduce((sum, o) => sum + o.confidence, 0) / officeResults.length
      : 0;

  const stopSuggestion = getSuggestion(questionsAnswered, totalQuestions, overallConfidence);

  return { officeResults, questionsAnswered, totalQuestions, overallConfidence, stopSuggestion };
}

// Below this many shared questions we say so instead of naming a match
export const MIN_SHARED_QUESTIONS = 2;
// A gap smaller than this (on a 0..1 agreement scale) is too close to call
export const CLOSE_GAP = 0.15;

function verdictFor(ranked: RankedCandidate[], sharedCount: number): OfficeResult["verdict"] {
  if (ranked.length < 2 || sharedCount < MIN_SHARED_QUESTIONS) return "not-enough";
  return ranked[0].normalized - ranked[1].normalized < CLOSE_GAP ? "too-close" : "match";
}

function computeConfidence(ranked: RankedCandidate[], sharedCount: number): number {
  if (ranked.length < 2 || sharedCount === 0) return 0;
  const gap = ranked[0].normalized - ranked[1].normalized;
  // Grows with the gap and with how many shared questions it rests on (plateaus at 5)
  const depthFactor = Math.min(sharedCount / 5, 1);
  return Math.min(gap * 2.5 * depthFactor, 1);
}

function getSuggestion(
  answered: number,
  total: number,
  confidence: number,
): QuizResults["stopSuggestion"] {
  if (answered === 0) return null;
  if (answered >= total || confidence >= 0.8) return "thorough";
  if (answered >= 12 || confidence >= 0.5) return "confident";
  if (answered >= 5) return "quick";
  return null;
}
