import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const { id: matchId } = await params;
  const match = await prisma.match.findFirst({
    where: { id: matchId, userId: user.id },
    select: { id: true, userId: true, targetUserId: true },
  });
  if (!match) return NextResponse.json({ code: 404 }, { status: 404 });

  const pairMatches = await prisma.match.findMany({
    where: {
      OR: [
        { userId: user.id, targetUserId: match.targetUserId },
        { userId: match.targetUserId, targetUserId: user.id },
      ],
    },
    select: { id: true },
  });

  const now = new Date();
  await Promise.all(
    pairMatches.map((m) =>
      prisma.matchRead.upsert({
        where: { matchId_userId: { matchId: m.id, userId: user.id } },
        update: { lastReadAt: now },
        create: { matchId: m.id, userId: user.id, lastReadAt: now },
      })
    )
  );

  return NextResponse.json({ code: 0, data: { lastReadAt: now.toISOString() } });
}

