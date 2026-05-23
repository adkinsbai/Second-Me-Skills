import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const privacyAccepted = body?.privacyAccepted === true;
  const agentLearnConsent = body?.agentLearnConsent === true;

  if (!privacyAccepted) {
    return NextResponse.json({ code: 400, message: "请先阅读并同意隐私说明" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      onboardingDone: true,
      privacyAcceptedAt: new Date(),
      agentLearnConsent: !!agentLearnConsent,
    },
  });

  return NextResponse.json({ code: 0 });
}
