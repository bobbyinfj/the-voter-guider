import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionId } from "@/lib/session";
import { handleApiError } from "@/lib/errors";
import { computeResults } from "@/lib/quiz/db";

export async function POST(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const body = await req.json();
    const { guideId, questionId, optionId, importance = 1 } = body;

    if (!guideId || !questionId || !optionId) {
      return NextResponse.json({ error: "guideId, questionId, optionId required" }, { status: 400 });
    }

    // Verify the guide belongs to this session
    const guide = await prisma.guide.findFirst({
      where: { id: guideId, sessionId },
    });
    if (!guide) {
      return NextResponse.json({ error: "Guide not found or unauthorized" }, { status: 403 });
    }

    // Verify question + option exist and belong to the same quiz
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { quiz: true },
    });
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const option = await prisma.questionOption.findFirst({
      where: { id: optionId, questionId },
    });
    if (!option) {
      return NextResponse.json({ error: "Option not found" }, { status: 404 });
    }

    // Upsert the answer
    await prisma.userAnswer.upsert({
      where: { guideId_questionId: { guideId, questionId } },
      update: { optionId, importance },
      create: { guideId, questionId, optionId, importance },
    });

    // Recompute results and next question
    const electionId = question.quiz.electionId;
    const results = await computeResults(guideId, electionId);

    return NextResponse.json(results);
  } catch (error) {
    const { message, statusCode } = handleApiError(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const { searchParams } = new URL(req.url);
    const guideId = searchParams.get("guideId");
    const questionId = searchParams.get("questionId");

    if (!guideId || !questionId) {
      return NextResponse.json({ error: "guideId and questionId required" }, { status: 400 });
    }

    const guide = await prisma.guide.findFirst({ where: { id: guideId, sessionId } });
    if (!guide) {
      return NextResponse.json({ error: "Guide not found or unauthorized" }, { status: 403 });
    }

    await prisma.userAnswer.deleteMany({ where: { guideId, questionId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const { message, statusCode } = handleApiError(error);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
