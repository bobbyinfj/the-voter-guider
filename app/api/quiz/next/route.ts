import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionId } from "@/lib/session";
import { handleApiError } from "@/lib/errors";
import { loadQuizContext } from "@/lib/quiz/db";
import { pickNextQuestion } from "@/lib/quiz/nextQuestion";
import { scoreQuiz } from "@/lib/quiz/score";
import type { ScoringAnswer, ScoringCandidate, ScoringQuestion } from "@/lib/quiz/types";

export async function GET(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const { searchParams } = new URL(req.url);
    const guideId = searchParams.get("guideId");

    if (!guideId) {
      return NextResponse.json({ error: "guideId required" }, { status: 400 });
    }

    const guide = await prisma.guide.findFirst({ where: { id: guideId, sessionId } });
    if (!guide) {
      return NextResponse.json({ error: "Guide not found or unauthorized" }, { status: 403 });
    }

    const { quiz, offices, issueNames, officeInfo } = await loadQuizContext(guide.electionId);

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

    const answeredIds = new Set<string>(answers.map((a: { questionId: string }) => a.questionId));
    const next = pickNextQuestion({
      questions: scoringQuestions,
      answeredQuestionIds: answeredIds,
      officeResults: results.officeResults,
    });

    // Return the full question data for the next question
    const nextQuestion = next.questionId
      ? quiz?.questions.find((q) => q.id === next.questionId)
      : null;

    return NextResponse.json({
      questionId: next.questionId,
      reason: next.reason,
      question: nextQuestion ?? null,
    });
  } catch (error) {
    const { message, statusCode } = handleApiError(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
