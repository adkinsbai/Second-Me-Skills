import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/achievements — 获取当前用户的所有成就
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });

  const achievements = await prisma.achievement.findMany({
    where: { userId: user.id },
    orderBy: { unlockedAt: "desc" },
  });

  return NextResponse.json({ code: 0, data: achievements });
}
