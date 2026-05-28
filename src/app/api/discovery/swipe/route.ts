import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createConnectedMatchPair, computeCompatibilityBetween } from "@/lib/matchCreation";
import { MATCH_THRESHOLD } from "@/lib/matchPipeline";
import { extractProfileTraits, type UserWithPreference } from "@/lib/matchStory";

function snapshotFor(user: UserWithPreference): Prisma.InputJsonValue {
  return {
    id: user.id,
    name: user.name,
    age: user.age,
    bio: user.bio,
    region: user.preference?.region ?? "",
    traits: extractProfileTraits(user),
    photos: [user.photo1, user.photo2, user.photo3, user.avatarUrl].filter(Boolean),
  };
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const targetUserId = typeof body?.targetUserId === "string" ? body.targetUserId : "";
  const action = body?.action === "like" ? "like" : body?.action === "unlike" ? "unlike" : "";
  if (!targetUserId || !action) {
    return NextResponse.json({ code: 400, message: "参数不完整" }, { status: 400 });
  }
  if (targetUserId === user.id) {
    return NextResponse.json({ code: 400, message: "不能滑自己" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { preference: true },
  });
  if (!target) return NextResponse.json({ code: 404, message: "用户不存在" }, { status: 404 });

  await prisma.userSwipeDecision.upsert({
    where: { viewerId_targetUserId: { viewerId: user.id, targetUserId } },
    create: {
      viewerId: user.id,
      targetUserId,
      action,
      targetSnapshotJson: snapshotFor(target as UserWithPreference),
    },
    update: {
      action,
      source: "discover",
      targetSnapshotJson: snapshotFor(target as UserWithPreference),
    },
  });

  let mutualMatch = false;
  let matchId: string | null = null;
  let mutualLike = false;
  let compatibilityScore: number | null = null;
  if (action === "like") {
    const reciprocal = await prisma.userSwipeDecision.findUnique({
      where: { viewerId_targetUserId: { viewerId: targetUserId, targetUserId: user.id } },
      select: { action: true },
    });
    if (reciprocal?.action === "like") {
      mutualLike = true;
      // Compute compatibility score before deciding to create match
      compatibilityScore = await computeCompatibilityBetween(user.id, targetUserId);
      if (compatibilityScore >= MATCH_THRESHOLD) {
        const created = await createConnectedMatchPair(user.id, targetUserId);
        mutualMatch = true;
        matchId = created.matchId;
      }
      // If score < MATCH_THRESHOLD, mutual like is recorded but no Match is created
    }
  }

  return NextResponse.json({
    code: 0,
    data: {
      action,
      mutualMatch,
      mutualLike,
      matchId,
      compatibilityScore,
    },
  });
}
