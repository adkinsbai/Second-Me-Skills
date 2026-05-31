import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkAchievements } from "@/lib/achievements";

// GET /api/user/prompts — 获取当前用户的所有 profile prompts
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });

  const prompts = await prisma.profilePrompt.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ code: 0, data: prompts });
}

// POST /api/user/prompts — 创建或更新 profile prompt
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const promptKey = typeof body?.promptKey === "string" ? body.promptKey.trim() : "";
  const answer = typeof body?.answer === "string" ? body.answer.trim() : "";

  if (!promptKey || !answer) {
    return NextResponse.json({ code: 400, message: "promptKey 和 answer 必填" }, { status: 400 });
  }

  if (answer.length > 500) {
    return NextResponse.json({ code: 400, message: "回答最多 500 字" }, { status: 400 });
  }

  const prompt = await prisma.profilePrompt.upsert({
    where: {
      userId_promptKey: { userId: user.id, promptKey },
    },
    update: { answer },
    create: { userId: user.id, promptKey, answer },
  });

  // 更新 profile completeness
  await updateProfileCompleteness(user.id);

  // Check achievements after prompt save
  await checkAchievements(user.id).catch(() => {});

  return NextResponse.json({ code: 0, data: prompt });
}

async function updateProfileCompleteness(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) return;
  let score = 0;
  if (u.name) score += 15;
  if (u.bio) score += 15;
  if (u.avatarUrl) score += 15;
  if (u.photo1) score += 10;
  if (u.photo2) score += 5;
  if (u.photo3) score += 5;
  if (u.gender) score += 5;
  if (u.age) score += 5;
  // 每个 prompt +5 分，最多 25 分
  const promptCount = await prisma.profilePrompt.count({ where: { userId } });
  score += Math.min(promptCount * 5, 25);
  await prisma.user.update({
    where: { id: userId },
    data: { profileCompleteness: Math.min(score, 100) },
  });
}
