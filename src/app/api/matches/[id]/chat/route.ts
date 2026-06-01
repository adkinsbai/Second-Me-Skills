import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { appendOwnerFact } from "@/lib/ownerInformation";
import { excerptForOwnerLearning } from "@/lib/humanChatLearning";
import { hitRateLimit } from "@/lib/rateLimit";
import { withCors, handleCorsPreflightRequest } from "@/lib/api-security";
import { sendPush } from "@/lib/send-push";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request) ?? NextResponse.next();
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });
  const { id } = params;
  const match = await prisma.match.findFirst({
    where: { id, userId: user.id },
    select: { id: true, userId: true, targetUserId: true },
  });
  if (!match) return NextResponse.json({ code: 404 }, { status: 404 });

  const pairMatches = await prisma.match.findMany({
    where: {
      OR: [
        { userId: user.id, targetUserId: match.targetUserId },
        { userId: match.targetUserId, targetUserId: user.id },
      ],
    },
    select: { id: true, userId: true, targetUserId: true },
  });
  const matchMetaMap = new Map(pairMatches.map((m) => [m.id, m]));
  const otherUserId = match.targetUserId;
  const otherReads = await prisma.matchRead.findMany({
    where: {
      userId: otherUserId,
      matchId: { in: pairMatches.map((m) => m.id) },
    },
    select: { matchId: true, lastReadAt: true },
  });
  const otherReadAtMap = new Map(otherReads.map((r) => [r.matchId, r.lastReadAt]));

  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(120, Math.max(10, Number(limitRaw ?? "60") || 60));

  const beforeRaw = request.nextUrl.searchParams.get("before");
  const beforeDate = beforeRaw ? new Date(beforeRaw) : null;

  const rawMessages = await prisma.matchMessage.findMany({
    where: {
      matchId: { in: pairMatches.map((m) => m.id) },
      senderType: { in: ["user_self", "user_target"] },
      ...(beforeDate ? { createdAt: { lt: beforeDate } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  });
  const messagesDesc = rawMessages
    .map((m) => {
      const owner = matchMetaMap.get(m.matchId);
      if (!owner) return null;
      let mapped: "user_self" | "user_target" = "user_target";
      if (owner.userId === user.id) {
        mapped = m.senderType === "user_self" ? "user_self" : "user_target";
      } else {
        mapped = m.senderType === "user_self" ? "user_target" : "user_self";
      }
      const createdAt = m.createdAt.toISOString();
      const readByOther =
        mapped === "user_self" &&
        (otherReadAtMap.get(m.matchId)?.getTime() ?? 0) >= m.createdAt.getTime();
      return {
        id: m.id,
        senderType: mapped,
        content: m.content,
        createdAt,
        readByOther,
      };
    })
    .filter(
      (x): x is {
        id: string;
        senderType: "user_self" | "user_target";
        content: string;
        createdAt: string;
        readByOther: boolean;
      } => !!x
    );

  // Prisma 取的是倒序，为了前端自然时间线，翻回正序
  const messages = messagesDesc.reverse();

  return withCors(
    NextResponse.json({
      code: 0,
      data: messages,
    }),
    request.headers.get("origin")
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });
  // Rate limit: max 60 messages per 5 minutes per user
  const rl = hitRateLimit(`chat:${user.id}`, 60, 5 * 60 * 1000);
  if (rl.limited) {
    return NextResponse.json({ code: 429, message: "发送过于频繁，请稍后再试" }, { status: 429 });
  }
  const { id: matchId } = params;
  const match = await prisma.match.findFirst({
    where: { id: matchId, userId: user.id },
  });
  if (!match) return NextResponse.json({ code: 404 }, { status: 404 });
  if (match.status !== "connected") {
    return NextResponse.json({ code: 403, message: "请先解锁与对方的聊天" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const content = String(body?.content ?? "").trim();
  if (!content) return NextResponse.json({ code: 400 }, { status: 400 });
  const safeContent = content.slice(0, 10000);
  const msg = await prisma.matchMessage.create({
    data: { matchId, senderType: "user_self", content: safeContent },
  });

  const learner = await prisma.user.findUnique({
    where: { id: user.id },
    select: { agentLearnConsent: true },
  });
  if (learner?.agentLearnConsent) {
    const excerpt = excerptForOwnerLearning(safeContent);
    if (excerpt) {
      appendOwnerFact(user.id, excerpt, "human_chat").catch(() => {});
    }
  }

  // 双向同步：把消息镜像到对方视角的匹配记录，确保真人聊天双方都能看到
  let reciprocal = await prisma.match.findFirst({
    where: {
      userId: match.targetUserId,
      targetUserId: match.userId,
    },
    select: { id: true, status: true },
  });
  if (!reciprocal) {
    reciprocal = await prisma.match.create({
      data: {
        userId: match.targetUserId,
        targetUserId: match.userId,
        status: "connected",
      },
      select: { id: true, status: true },
    });
  } else if (reciprocal.status !== "connected") {
    await prisma.match.update({
      where: { id: reciprocal.id },
      data: { status: "connected" },
    });
  }
  const reciprocalMatches = await prisma.match.findMany({
    where: {
      userId: match.targetUserId,
      targetUserId: match.userId,
    },
    select: { id: true },
  });
  const targetIds = reciprocalMatches.length > 0 ? reciprocalMatches.map((x) => x.id) : [reciprocal.id];
  await prisma.matchMessage.createMany({
    data: targetIds.map((targetMatchId) => ({
      matchId: targetMatchId,
      senderType: "user_target",
      content: safeContent,
    })),
  });

  // Send push notification to recipient (fire-and-forget)
  const senderName = user.name || "丘比用户";
  sendPush(
    match.targetUserId,
    senderName,
    safeContent.length > 60 ? safeContent.slice(0, 60) + "..." : safeContent,
    "/matches/" + matchId,
  ).catch(() => {});

  return withCors(
    NextResponse.json({
      code: 0,
      data: { id: msg.id, senderType: msg.senderType, content: msg.content, createdAt: msg.createdAt.toISOString() },
    }),
    request.headers.get("origin")
  );
}
