import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { learnFromChats } from "@/lib/chatLearning";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Find active users (users with messages in the last 7 days)
  const activeMatches = await prisma.match.findMany({
    where: {
      messages: {
        some: {
          createdAt: { gte: sevenDaysAgo },
        },
      },
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  const userIds = activeMatches.map((m) => m.userId);
  const results: { userId: string; processed: number; updated: boolean }[] = [];

  for (const userId of userIds) {
    try {
      const result = await learnFromChats(userId);
      results.push({ userId, processed: result.processed, updated: result.updated });
    } catch {
      results.push({ userId, processed: 0, updated: false });
    }
  }

  return NextResponse.json({
    code: 0,
    data: {
      usersProcessed: results.length,
      results,
    },
  });
}
