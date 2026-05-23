import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const answers = body?.answers;
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ code: 400, message: "缺少答题数据" }, { status: 400 });
  }

  // Extract structured fields from answers for direct DB columns
  const updateData: Record<string, unknown> = {
    profileAnswers: answers,
    onboardingDone: true,
  };

  if (answers.gender) updateData.gender = String(answers.gender);
  if (answers.age) {
    const age = Number(answers.age);
    if (age >= 16 && age <= 99) updateData.age = age;
  }
  if (answers.bio) updateData.bio = String(answers.bio).slice(0, 300);

  await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  // Also upsert user preference from answers
  if (answers.lookingFor || answers.expectedGender) {
    await prisma.userPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        expectedGender: answers.expectedGender ?? null,
        matchTypes: answers.lookingFor ? JSON.stringify([answers.lookingFor]) : null,
      },
      update: {
        ...(answers.expectedGender ? { expectedGender: String(answers.expectedGender) } : {}),
        ...(answers.lookingFor ? { matchTypes: JSON.stringify([answers.lookingFor]) } : {}),
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
