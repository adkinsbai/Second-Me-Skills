import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const MAX_LEN = 500;
const MAX_LIST = 80;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const { id: postId } = await params;
  const post = await prisma.townPost.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) return NextResponse.json({ code: 404, message: "帖子不存在" }, { status: 404 });

  const rows = await prisma.townPostComment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    take: MAX_LIST,
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({
    code: 0,
    data: {
      comments: rows.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        author: c.user,
      })),
    },
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "请先登录" }, { status: 401 });

  const { id: postId } = await params;
  const post = await prisma.townPost.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) return NextResponse.json({ code: 404, message: "帖子不存在" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const content = String(body?.content ?? "").trim().slice(0, MAX_LEN);
  if (!content) return NextResponse.json({ code: 400, message: "评论不能为空" }, { status: 400 });

  const created = await prisma.townPostComment.create({
    data: { postId, userId: user.id, content },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  const commentCount = await prisma.townPostComment.count({ where: { postId } });

  return NextResponse.json({
    code: 0,
    data: {
      comment: {
        id: created.id,
        content: created.content,
        createdAt: created.createdAt.toISOString(),
        author: created.user,
      },
      commentCount,
    },
  });
}
