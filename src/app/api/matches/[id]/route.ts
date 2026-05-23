import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

function extractMatchReason(reportJson?: string | null, summary?: string | null) {
  if (reportJson) {
    try {
      const parsed = JSON.parse(reportJson) as { matchReason?: unknown };
      if (typeof parsed.matchReason === "string" && parsed.matchReason.trim()) return parsed.matchReason;
    } catch {
      // ignore legacy report payloads
    }
  }
  return summary ?? "";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });
  const { id } = await params;
  const match = await prisma.match.findFirst({
    where: { id, userId: user.id },
    include: {
      targetUser: { select: { id: true, name: true, avatarUrl: true, bio: true } },
      scores: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!match) return NextResponse.json({ code: 404 }, { status: 404 });
  const latest = match.scores[0];
  return NextResponse.json({
    code: 0,
    data: {
      id: match.id,
      status: match.status,
      targetUser: match.targetUser,
      latestScore: latest
        ? {
            totalScore: latest.totalScore,
            interestScore: latest.interestScore,
            personalityScore: latest.personalityScore,
            valuesScore: latest.valuesScore,
            lifeStoryScore: latest.lifeStoryScore,
            futureScore: latest.futureScore,
            summary: latest.summary,
            matchReason: extractMatchReason(latest.reportJson, latest.summary),
            reportJson: latest.reportJson,
          }
        : null,
      canUnlockChat: true,
    },
  });
}

// 删除一条匹配记录（含关联的评分/消息/反馈将通过级联一并删除）
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });
  const { id } = await params;

  const match = await prisma.match.findFirst({
    where: { id, userId: user.id },
  });
  if (!match) return NextResponse.json({ code: 404 }, { status: 404 });

  await prisma.match.delete({ where: { id: match.id } });

  return NextResponse.json({ code: 0 });
}

