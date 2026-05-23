import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });
  const { id } = await params;
  const match = await prisma.match.findFirst({
    where: { id, userId: user.id },
    include: { scores: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!match) return NextResponse.json({ code: 404 }, { status: 404 });
  const latest = match.scores[0];
  await prisma.match.update({
    where: { id },
    data: { status: "connected" },
  });

  // 保证对方侧也能看到同一段真人聊天
  const reciprocal = await prisma.match.findFirst({
    where: {
      userId: match.targetUserId,
      targetUserId: match.userId,
    },
    include: { scores: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!reciprocal) {
    const created = await prisma.match.create({
      data: {
        userId: match.targetUserId,
        targetUserId: match.userId,
        status: "connected",
      },
    });
    if (latest) {
      await prisma.matchScore.create({
        data: {
          matchId: created.id,
          totalScore: latest.totalScore,
          interestScore: latest.interestScore,
          personalityScore: latest.personalityScore,
          valuesScore: latest.valuesScore,
          lifeStoryScore: latest.lifeStoryScore,
          futureScore: latest.futureScore,
          summary: latest.summary,
          reportJson: latest.reportJson,
        },
      });
    }
  } else if (reciprocal.status !== "connected") {
    await prisma.match.update({
      where: { id: reciprocal.id },
      data: { status: "connected" },
    });
  }

  return NextResponse.json({ code: 0, data: { status: "connected" } });
}
