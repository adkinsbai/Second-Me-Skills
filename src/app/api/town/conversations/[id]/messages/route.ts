import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const conversationId = params.id;
  const conversation = await prisma.townConversation.findFirst({
    where: { id: conversationId, OR: [{ requesterId: user.id }, { candidateId: user.id }] },
    select: { id: true, requesterId: true, candidateId: true },
  });
  if (!conversation) return NextResponse.json({ code: 404 }, { status: 404 });

  const limitRaw = _request.nextUrl.searchParams.get("limit");
  const limit = Math.min(80, Math.max(10, Number(limitRaw ?? "40") || 40));

  const messages = await prisma.townConversationMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, senderUserId: true, content: true, createdAt: true },
  });

  const now = new Date();
  await prisma.townConversationRead.upsert({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    update: { lastReadAt: now },
    create: { conversationId, userId: user.id, lastReadAt: now },
  });

  return NextResponse.json({
    code: 0,
    data: {
      messages: messages.map((m) => ({
        id: m.id,
        senderUserId: m.senderUserId,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const conversationId = params.id;
  const conversation = await prisma.townConversation.findFirst({
    where: { id: conversationId, OR: [{ requesterId: user.id }, { candidateId: user.id }] },
    select: { id: true },
  });
  if (!conversation) return NextResponse.json({ code: 404 }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const content = String(body?.content ?? "").trim();
  if (!content) return NextResponse.json({ code: 400, message: "内容不能为空" }, { status: 400 });

  const safeContent = content.slice(0, 10000);
  const now = new Date();

  const msg = await prisma.townConversationMessage.create({
    data: { conversationId, senderUserId: user.id, content: safeContent },
  });

  await prisma.townConversationRead.upsert({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    update: { lastReadAt: now },
    create: { conversationId, userId: user.id, lastReadAt: now },
  });

  return NextResponse.json({
    code: 0,
    data: {
      message: {
        id: msg.id,
        senderUserId: msg.senderUserId,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
      },
    },
  });
}

