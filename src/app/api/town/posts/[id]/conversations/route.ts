import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "请先登录" }, { status: 401 });

  const postId = params.id;
  const body = await request.json().catch(() => ({}));
  const candidateUserId = String(body?.candidateUserId ?? "").trim();
  const openerMessage = String(body?.openerMessage ?? "").trim();

  if (!candidateUserId) return NextResponse.json({ code: 400, message: "缺少 candidateUserId" }, { status: 400 });
  if (!openerMessage) return NextResponse.json({ code: 400, message: "开场信息不能为空" }, { status: 400 });

  if (openerMessage.length > 2000) {
    return NextResponse.json({ code: 400, message: "开场信息过长，请控制在 2000 字以内" }, { status: 400 });
  }

  const post = await prisma.townPost.findFirst({
    where: { id: postId, userId: user.id },
    select: { id: true },
  });
  if (!post) return NextResponse.json({ code: 404, message: "帖子不存在或无权限" }, { status: 404 });

  const candidate = await prisma.user.findUnique({
    where: { id: candidateUserId },
    select: { id: true, name: true, avatarUrl: true },
  });
  if (!candidate) return NextResponse.json({ code: 404, message: "候选人不存在" }, { status: 404 });

  const now = new Date();

  const existing = await prisma.townConversation.findFirst({
    where: { postId: post.id, requesterId: user.id, candidateId: candidate.id },
    select: { id: true },
  });

  let conversationId: string;
  if (existing) {
    conversationId = existing.id;
  } else {
    const created = await prisma.townConversation.create({
      data: {
        postId: post.id,
        requesterId: user.id,
        candidateId: candidate.id,
        openerMessage,
      },
      select: { id: true },
    });
    conversationId = created.id;

    await prisma.townConversationMessage.create({
      data: {
        conversationId,
        senderUserId: user.id,
        content: openerMessage.slice(0, 200000),
      },
    });
  }

  await prisma.townConversationRead.upsert({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    update: { lastReadAt: now },
    create: { conversationId, userId: user.id, lastReadAt: now },
  });

  return NextResponse.json({
    code: 0,
    data: {
      conversationId,
      otherUser: candidate,
    },
  });
}

