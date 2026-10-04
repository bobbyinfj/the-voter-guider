import { prisma } from "@/lib/prisma";
import type { ScoringAnswer, ScoringCandidate, ScoringQuestion } from "./types";
import { scoreQuiz } from "./score";
import { pickNextQuestion } from "./nextQuestion";
import type { QuizResults } from "./types";

export async function loadQuizContext(electionId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { electionId },
    include: {
      questions: {
        include: {
          options: { orderBy: { order: "asc" } },
          issues: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });

  const offices = await prisma.office.findMany({
    where: { electionId },
    include: {
      candidates: {
        include: { stances: true },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  const issues = await prisma.issue.findMany();
  const issueNames: Record<string, string> = Object.fromEntries(
    issues.map((i) => [i.id, i.name]),
  );
  const officeInfo: Record<string, { title: string }> = Object.fromEntries(
    offices.map((o) => [o.id, { title: o.title }]),
  );

  return { quiz, offices, issueNames, officeInfo };
}

export async function computeResults(
  guideId: string,
  electionId: string,
): Promise<QuizResults & { nextQuestionId: string | null }> {
  const { quiz, offices, issueNames, officeInfo } = await loadQuizContext(electionId);

  const answers = await prisma.userAnswer.findMany({
    where: { guideId },
    include: { option: true },
  });

  const scoringAnswers: ScoringAnswer[] = answers.map((a) => ({
    questionId: a.questionId,
    optionId: a.optionId,
    stanceValue: a.option.stanceValue,
    importance: a.importance,
  }));

  const scoringCandidates: ScoringCandidate[] = offices.flatMap((o) =>
    o.candidates.map((c) => ({
      id: c.id,
      name: c.name,
      party: c.party,
      photoUrl: c.photoUrl,
      incumbent: c.incumbent,
      officeId: o.id,
      stances: c.stances.map((s) => ({ issueId: s.issueId, position: s.position })),
    })),
  );

  const scoringQuestions: ScoringQuestion[] = (quiz?.questions ?? []).map((q) => ({
    id: q.id,
    prompt: q.prompt,
    order: q.order,
    issues: q.issues.map((qi) => ({ issueId: qi.issueId, weight: qi.weight })),
  }));

  const results = scoreQuiz({
    candidates: scoringCandidates,
    questions: scoringQuestions,
    answers: scoringAnswers,
    issueNames,
    officeInfo,
    totalQuestions: quiz?.questions.length ?? 0,
  });

  const answeredIds = new Set<string>(answers.map((a) => a.questionId));
  const nextQuestion = pickNextQuestion({
    questions: scoringQuestions,
    answeredQuestionIds: answeredIds,
    officeResults: results.officeResults,
  });

  return { ...results, nextQuestionId: nextQuestion.questionId };
}
