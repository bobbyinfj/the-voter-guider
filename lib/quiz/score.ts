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

    const rankedCandidates: RankedCandidate[] = officeCandidates.map((candidate) => {
      let score = 0;
      let maxPossible = 0;
      const breakdown: ContributionItem[] = [];

      for (const [questionId, answer] of answerMap) {
        const question = questionMap.get(questionId);
        if (!question) continue;

        for (const { issueId, weight } of question.issues) {
          const stance = candidate.stances.find((s) => s.issueId === issueId);
          if (!stance) continue;

          const agreement = 4 - Math.abs(answer.stanceValue - stance.position);
          const contribution = agreement * weight * answer.importance;
          const maxContribution = 4 * weight * answer.importance;

          score += contribution;
          maxPossible += maxContribution;

          breakdown.push({
            questionId,
            questionPrompt: question.prompt,
            issueId,
            issueName: issueNames[issueId] ?? issueId,
            candidateStance: stance.position,
            userStance: answer.stanceValue,
            qWeight: weight,
            importance: answer.importance,
            agreement,
            contribution,
          });
        }
      }

      const normalized = maxPossible > 0 ? score / maxPossible : 0;
      return { candidate, score, maxPossible, normalized, breakdown };
    });

    // Candidates with no stated position on anything answered so far sort last — an
    // unknown is not a disagreement
    rankedCandidates.sort(
      (a, b) =>
        Number(b.maxPossible > 0) - Number(a.maxPossible > 0) || b.normalized - a.normalized,
    );

    const confidence = computeConfidence(rankedCandidates, answers.length);
    officeResults.push({
      officeId,
      officeTitle: officeInfo[officeId]?.title ?? officeId,
      rankedCandidates,
      confidence,
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

function computeConfidence(allRanked: RankedCandidate[], answeredCount: number): number {
  if (allRanked.length < 2) return 1;
  const ranked = allRanked.filter((r) => r.maxPossible > 0);
  if (ranked.length < 2) return 0;
  if (answeredCount === 0) return 0;
  const gap = ranked[0].normalized - ranked[1].normalized;
  // Confidence grows with both gap and number of answers (plateaus at 10 questions)
  const depthFactor = Math.min(answeredCount / 10, 1);
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
