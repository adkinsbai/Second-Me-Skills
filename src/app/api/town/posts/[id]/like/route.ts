import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "请先登录" }, { status: 401 });

  const { id: postId } = await params;
  const post = await prisma.townPost.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) return NextResponse.json({ code: 404, message: "帖子不存在" }, { status: 404 });

  const existing = await prisma.townPostLike.findUnique({
    where: { postId_userId: { postId, userId: user.id } },
  });

  if (existing) {
    await prisma.townPostLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.townPostLike.create({ data: { postId, userId: user.id } });
  }

  const likeCount = await prisma.townPostLike.count({ where: { postId } });

  return NextResponse.json({
    code: 0,
    data: { liked: !existing, likeCount },
  });
}
