import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const BASE_URL = process.env.SECONDME_API_BASE_URL;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });
  const { id: matchId } = await params;
  const match = await prisma.match.findFirst({
    where: { id: matchId, userId: user.id },
  });
  if (!match) return NextResponse.json({ code: 404 }, { status: 404 });
  const body = await request.json();
  const vibeScore = Math.min(5, Math.max(0, Number(body.vibeScore) ?? 0));
  const valuesScore = Math.min(5, Math.max(0, Number(body.valuesScore) ?? 0));
  const potentialScore = Math.min(5, Math.max(0, Number(body.potentialScore) ?? 0));
  const comment = typeof body.comment === "string" ? body.comment.slice(0, 2000) : null;
  const feedback = await prisma.matchFeedback.create({
    data: {
      matchId,
      raterUserId: user.id,
      vibeScore,
      valuesScore,
      potentialScore,
      comment: comment || undefined,
    },
  });
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.accessToken && (comment || [vibeScore, valuesScore, potentialScore].some((s) => s > 0))) {
    const noteContent = [
      `[丘比·聊天反馈] 匹配 ${matchId}`,
      `聊天感觉: ${vibeScore}/5 | 价值观契合: ${valuesScore}/5 | 发展潜力: ${potentialScore}/5`,
      comment ? `反馈: ${comment}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await fetch(`${BASE_URL}/api/secondme/note/add`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dbUser.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: noteContent, memoryType: "TEXT" }),
      });
    } catch {
      // 忽略 note 失败，本地已存
    }
  }
  return NextResponse.json({
    code: 0,
    data: {
      id: feedback.id,
      vibeScore: feedback.vibeScore,
      valuesScore: feedback.valuesScore,
      potentialScore: feedback.potentialScore,
      comment: feedback.comment,
      createdAt: feedback.createdAt.toISOString(),
    },
  });
}
