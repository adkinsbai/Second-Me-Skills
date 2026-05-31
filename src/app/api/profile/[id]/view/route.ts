import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// POST /api/profile/[id]/view — 记录一次 profile 查看
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });

  const viewedId = params.id;
  if (!viewedId || viewedId === user.id) {
    return NextResponse.json({ code: 400, message: "无效的目标用户" }, { status: 400 });
  }

  // 检查目标用户存在
  const target = await prisma.user.findUnique({
    where: { id: viewedId },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ code: 404, message: "用户不存在" }, { status: 404 });
  }

  // 防刷：同一用户对同一目标 1 小时内只记录一次
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentView = await prisma.profileView.findFirst({
    where: {
      viewerId: user.id,
      viewedId,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentView) {
    return NextResponse.json({ code: 0, message: "已记录过浏览", data: { recorded: false } });
  }

  // 记录浏览
  await prisma.profileView.create({
    data: {
      viewerId: user.id,
      viewedId,
    },
  });

  // 更新被查看用户的 viewCount 和 popularityScore
  await prisma.user.update({
    where: { id: viewedId },
    data: {
      viewCount: { increment: 1 },
      popularityScore: { increment: 1 },
    },
  });

  return NextResponse.json({ code: 0, message: "浏览已记录", data: { recorded: true } });
}
