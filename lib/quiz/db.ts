import { prisma } from "@/lib/prisma";
import type { ScoringAnswer, ScoringCandidate, ScoringQuestion } from "./types";
import { scoreQuiz } from "./score";
import { pickNextQuestion } from "./nextQuestion";
import { flatImportance, importanceEffect, ratedDifferently } from "./insight";
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

  return { quiz, offices, issues, issueNames, officeInfo };
}

// `modules`: the parts of the quiz the voter chose (null: all). Scoring always uses every answer;
// only which question comes next is limited to the chosen modules.
export async function computeResults(
  guideId: string,
  electionId: string,
  modules: QuizModule[] | null = null,
  // Issue slugs the voter put first: their questions are asked before the rest
  topIssues: string[] = [],
): Promise<
  QuizResults & {
    nextQuestionId: string | null;
    modules: { module: QuizModule; label: string; count: number }[];
    topics: { slug: string; name: string }[];
  }
> {
  const guide = await prisma.guide.findUnique({ where: { id: guideId }, select: { metadata: true } });
  const { quiz, offices, issues, issueNames, officeInfo } = await loadQuizContext(
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

  const score = (scored: ScoringAnswer[]) =>
    scoreQuiz({
      candidates: scoringCandidates,
      questions: scoringQuestions,
      answers: scored,
      issueNames,
      officeInfo,
      totalQuestions: quiz?.questions.length ?? 0,
    });
  const results = score(scoringAnswers);

  // Only ask what can help compare a race: a question no race could ever be compared on
  // (some candidate in every race lacks a sourced position on it) is left out
  const useful = new Set(results.officeResults.filter((o) => o.decidable).flatMap((o) => o.decisiveQuestionIds));
  const usefulQuestions = scoringQuestions.filter((q) => useful.has(q.id));
  const byQuestion = questionModules(usefulQuestions, offices);
  const answeredIds = new Set<string>(answers.map((a) => a.questionId));
  const asked = questionsFor(usefulQuestions, byQuestion, modules);
  const topIds = new Set(issues.filter((i) => topIssues.includes(i.slug)).map((i) => i.id));
  const topFirst = asked.filter((q) => !answeredIds.has(q.id) && q.issues.some((i) => topIds.has(i.issueId)));
  const nextQuestion = pickNextQuestion({
    questions: topFirst.length ? topFirst : asked,
    answeredQuestionIds: answeredIds,
    officeResults: results.officeResults.filter((o) => o.decidable),
  });

  return {
    ...results,
    totalQuestions: usefulQuestions.length,
    questionsAnswered: answers.filter((a) => useful.has(a.questionId)).length,
    nextQuestionId: nextQuestion.questionId,
    modules: moduleCounts(byQuestion),
    topics: issues
      .filter((i) => asked.some((q) => q.issues.some((qi) => qi.issueId === i.id)))
      .map((i) => ({ slug: i.slug, name: i.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    importanceEffect: ratedDifferently(scoringAnswers) ? importanceEffect(results, score(flatImportance(scoringAnswers))) : undefined,
  };
}
