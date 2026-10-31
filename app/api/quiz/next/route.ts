import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getViewer, ownedBy } from "@/lib/owner";
import { handleApiError } from "@/lib/errors";
import { computeResults } from "@/lib/quiz/db";
import { parseModules } from "@/lib/quiz/modules";

// The next question to ask (within the chosen quiz modules, ?modules=county,city), plus the
// modules on offer for this voter's ballot
export async function GET(req: NextRequest) {
  try {
    const viewer = await getViewer();
    const { searchParams } = new URL(req.url);
    const guideId = searchParams.get("guideId");

    if (!guideId) {
      return NextResponse.json({ error: "guideId required" }, { status: 400 });
    }

    const guide = await prisma.guide.findFirst({ where: { AND: [{ id: guideId }, ownedBy(viewer)] } });
    if (!guide) {
      return NextResponse.json({ error: "Guide not found or unauthorized" }, { status: 403 });
    }

    const top = searchParams.get("top")?.split(",").filter(Boolean) ?? [];
    const results = await computeResults(guideId, guide.electionId, parseModules(searchParams.get("modules")), top);
    const question = results.nextQuestionId
      ? await prisma.question.findUnique({
          where: { id: results.nextQuestionId },
          include: {
            options: { orderBy: { order: "asc" } },
            issues: { select: { issue: { select: { slug: true, name: true } } } },
          },
        })
      : null;
    const races = results.officeResults.filter((o) => o.decidable);

    return NextResponse.json({
      questionId: results.nextQuestionId,
      question: question && {
        ...question,
        topics: question.issues.map((i) => i.issue),
        // The races on this ballot this question helps compare
        compares: races.filter((o) => o.decisiveQuestionIds.includes(question.id)).map((o) => o.officeTitle),
      },
      // What the quiz can do for this ballot: the races it can compare, and how many questions
      races: races.map((o) => o.officeTitle),
      totalQuestions: results.totalQuestions,
      answered: results.questionsAnswered,
      modules: results.modules,
      topics: results.topics,
    });
  } catch (error) {
    const { message, statusCode } = handleApiError(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
