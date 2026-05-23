import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  const full = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      bio: true,
      email: true,
      authProvider: true,
      secondmeUserId: true,
      onboardingDone: true,
      privacyAcceptedAt: true,
      agentLearnConsent: true,
    },
  });
  return NextResponse.json({
    user: full
      ? {
          id: full.id,
          name: full.name,
          avatarUrl: full.avatarUrl,
          bio: full.bio ?? "",
          email: full.email ?? null,
          authProvider: full.authProvider,
          hasSecondMe: !!full.secondmeUserId,
          onboardingDone: full.onboardingDone,
          privacyAcceptedAt: full.privacyAcceptedAt?.toISOString() ?? null,
          agentLearnConsent: full.agentLearnConsent,
        }
      : {
          id: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl,
          bio: "",
          email: user.email,
          authProvider: user.authProvider,
          hasSecondMe: !!user.secondmeUserId,
          onboardingDone: true,
          privacyAcceptedAt: null,
          agentLearnConsent: false,
        },
  });
}
