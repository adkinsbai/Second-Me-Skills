import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hitRateLimit } from "@/lib/rateLimit";
import { withCors, handleCorsPreflightRequest } from "@/lib/api-security";
import { sendPush } from "@/lib/send-push";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request) ?? NextResponse.next();
}

/**
 * POST /api/matches/[id]/miss-you
 * Sends a special "想你了" message with a rate limit of 3 per day per match.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const { id: matchId } = params;
  const match = await prisma.match.findFirst({
    where: { id: matchId, userId: user.id },
    select: { id: true, userId: true, targetUserId: true, status: true },
  });
  if (!match) return NextResponse.json({ code: 404 }, { status: 404 });
  if (match.status !== "connected") {
    return NextResponse.json({ code: 403, message: "请先解锁聊天" }, { status: 403 });
  }

  // Rate limit: max 3 per day per match per user
  const rlKey = `miss-you:${matchId}:${user.id}`;
  const rl = hitRateLimit(rlKey, 3, 24 * 60 * 60 * 1000);
  if (rl.limited) {
    return NextResponse.json(
      { code: 429, message: "今天已经发了 3 次想你了，留点明天再说吧 💕" },
      { status: 429 }
    );
  }

  const missYouContent = "__MISS_YOU_SIGNAL__";

  // Create message in own match
  const msg = await prisma.matchMessage.create({
    data: { matchId, senderType: "user_self", content: missYouContent },
  });

  // Mirror to target's match
  const reciprocal = await prisma.match.findFirst({
    where: { userId: match.targetUserId, targetUserId: match.userId },
    select: { id: true, status: true },
  });
  if (reciprocal) {
    await prisma.matchMessage.create({
      data: {
        matchId: reciprocal.id,
        senderType: "user_target",
        content: missYouContent,
      },
    });
  }

  // Send push notification
  const senderName = user.name || "丘比用户";
  sendPush(
    match.targetUserId,
    `${senderName} 想你了`,
    "💌 有人在想你哦~ 点击查看",
    `/matches/${matchId}`,
  ).catch(() => {});

  return withCors(
    NextResponse.json({
      code: 0,
      data: {
        id: msg.id,
        content: missYouContent,
        createdAt: msg.createdAt.toISOString(),
      },
    }),
    request.headers.get("origin")
  );
}
