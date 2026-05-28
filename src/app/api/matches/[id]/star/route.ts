import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

function calcConsecutiveDays(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = Array.from(new Set(dates)).sort().reverse();
  const today = new Date().toISOString().split("T")[0];
  if (sorted[0] !== today) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });

  const { id: matchId } = await params;
  const match = await prisma.match.findFirst({
    where: { id: matchId, userId: user.id },
  });
  if (!match) return NextResponse.json({ code: 404, message: "匹配不存在" }, { status: 404 });

  const messages = await prisma.matchMessage.findMany({
    where: {
      matchId,
      senderType: { startsWith: "user_" },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const chatDates = messages.map((m) => m.createdAt.toISOString().split("T")[0]);
  const chatDayCount = new Set(chatDates).size;
  const starDays = calcConsecutiveDays(chatDates);
  const starLitAt = chatDayCount >= 1 && match.starLitAt ? match.starLitAt.toISOString() : chatDayCount >= 1 ? new Date().toISOString() : null;
  const isStarLit = chatDayCount >= 1;

  return NextResponse.json({
    code: 0,
    data: {
      starDays,
      starLitAt,
      chatDayCount,
      isStarLit,
    },
  });
}
