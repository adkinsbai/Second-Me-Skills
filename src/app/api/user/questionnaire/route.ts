import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((item) => String(item).trim())
        .filter(Boolean)
        .slice(0, 20)
    : [];
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const answers = body?.answers;
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ code: 400, message: "缺少问卷数据" }, { status: 400 });
  }

  const answerMap = answers as Record<string, unknown>;
  const updateData: Record<string, unknown> = {
    profileAnswers: answerMap,
    onboardingDone: true,
  };

  if (answerMap.gender) updateData.gender = String(answerMap.gender);
  if (answerMap.age) {
    const age = Number(answerMap.age);
    if (age >= 16 && age <= 99) updateData.age = age;
  }
  if (answerMap.bio) updateData.bio = String(answerMap.bio).slice(0, 300);

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  const activityTags = stringArray(answerMap.interests);
  const sparks = stringArray(answerMap.sparks);
  const matchTypes = [
    ...(answerMap.lookingFor ? [String(answerMap.lookingFor)] : []),
    ...sparks,
  ];

  if (matchTypes.length || answerMap.expectedGender || activityTags.length) {
    await prisma.userPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        expectedGender: answerMap.expectedGender ? String(answerMap.expectedGender) : "any",
        matchTypes: matchTypes.length ? JSON.stringify(matchTypes) : null,
        activityTags: activityTags.length ? JSON.stringify(activityTags) : null,
      },
      update: {
        ...(answerMap.expectedGender ? { expectedGender: String(answerMap.expectedGender) } : {}),
        ...(matchTypes.length ? { matchTypes: JSON.stringify(matchTypes) } : {}),
        ...(activityTags.length ? { activityTags: JSON.stringify(activityTags) } : {}),
      },
    });
  }

  return NextResponse.json({ code: 0, message: "保存成功" });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { profileAnswers: true },
  });

  return NextResponse.json({ code: 0, data: { answers: dbUser?.profileAnswers ?? null } });
}
