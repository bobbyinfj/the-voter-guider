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

    const results = await computeResults(guideId, guide.electionId, parseModules(searchParams.get("modules")));
    const question = results.nextQuestionId
      ? await prisma.question.findUnique({
          where: { id: results.nextQuestionId },
          include: { options: { orderBy: { order: "asc" } } },
        })
      : null;

    return NextResponse.json({
      questionId: results.nextQuestionId,
      question,
      modules: results.modules,
    });
  } catch (error) {
    const { message, statusCode } = handleApiError(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
