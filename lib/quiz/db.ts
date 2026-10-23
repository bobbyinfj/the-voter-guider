import { prisma } from "@/lib/prisma";
import type { ScoringAnswer, ScoringCandidate, ScoringQuestion } from "./types";
import { scoreQuiz } from "./score";
import { pickNextQuestion } from "./nextQuestion";
import { matchesSelection, parseDistrictSelection } from "@/lib/districts";
import type { QuizResults } from "./types";
import { moduleCounts, questionModules, questionsFor, type QuizModule } from "./modules";

export async function loadQuizContext(electionId: string, guideMetadata?: unknown) {
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

  const allOffices = await prisma.office.findMany({
    where: { electionId },
    include: {
      candidates: {
        include: { stances: true },
      },
      // The race's ballot row carries the city scope (metadata.scope)
      ballot: { select: { metadata: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  // Only score races in the districts the voter picked before starting the quiz
  const districts =
    guideMetadata && typeof guideMetadata === "object" && "districts" in guideMetadata
      ? (guideMetadata as { districts?: unknown }).districts
      : undefined;
  const selection = parseDistrictSelection(
    districts && typeof districts === "object" ? (districts as Record<string, unknown>) : null,
  );
  const offices = allOffices.filter((o) => matchesSelection({ ...o, metadata: o.ballot?.metadata }, selection));

  const issues = await prisma.issue.findMany();
  const issueNames: Record<string, string> = Object.fromEntries(
    issues.map((i) => [i.id, i.name]),
  );
  const officeInfo: Record<string, { title: string }> = Object.fromEntries(
    offices.map((o) => [o.id, { title: o.title }]),
  );

  return { quiz, offices, issueNames, officeInfo };
}

// `modules`: the parts of the quiz the voter chose (null: all). Scoring always uses every answer;
// only which question comes next is limited to the chosen modules.
export async function computeResults(
  guideId: string,
  electionId: string,
  modules: QuizModule[] | null = null,
): Promise<
  QuizResults & {
    nextQuestionId: string | null;
    modules: { module: QuizModule; label: string; count: number }[];
  }
> {
  const guide = await prisma.guide.findUnique({ where: { id: guideId }, select: { metadata: true } });
  const { quiz, offices, issueNames, officeInfo } = await loadQuizContext(
    electionId,
    guide?.metadata,
  );

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

  const byQuestion = questionModules(scoringQuestions, offices);
  const answeredIds = new Set<string>(answers.map((a) => a.questionId));
  const nextQuestion = pickNextQuestion({
    questions: questionsFor(scoringQuestions, byQuestion, modules),
    answeredQuestionIds: answeredIds,
    officeResults: results.officeResults,
  });

  return { ...results, nextQuestionId: nextQuestion.questionId, modules: moduleCounts(byQuestion) };
}
