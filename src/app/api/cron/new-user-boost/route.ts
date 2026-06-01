import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isNewUser } from '@/lib/newUserBoost';
import { runMatchPipeline, MATCH_THRESHOLD } from '@/lib/matchPipeline';

const NEW_USER_THRESHOLD = 50;

export async function GET(request: NextRequest) {
  return handleNewUserBoost(request);
}
export async function POST(request: NextRequest) {
  return handleNewUserBoost(request);
}

async function handleNewUserBoost(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ code: 401, message: '未授权' }, { status: 401 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newUsers = await prisma.user.findMany({
    where: {
      createdAt: { gte: sevenDaysAgo },
      NOT: { authProvider: 'guest' },
    },
    select: { id: true, createdAt: true, name: true },
  });

  let boosted = 0;
  const results: { userId: string; newMatches: number }[] = [];

  for (const user of newUsers) {
    if (!isNewUser(user.createdAt)) continue;

    const existingMatchCount = await prisma.match.count({
      where: { userId: user.id },
    });
    if (existingMatchCount >= MIN_MATCHES_FIRST_WEEK) continue;

    const existingMatchTargets = await prisma.match.findMany({
      where: { userId: user.id },
      select: { targetUserId: true },
    });
    const excludeIds = existingMatchTargets.map((m) => m.targetUserId);
    excludeIds.push(user.id);

    try {
      const pipeline = await runMatchPipeline(user.id, excludeIds);
      // Use relaxed threshold for new users
      const eligible = pipeline.ranked.filter((r) => r.scored.finalScore >= NEW_USER_THRESHOLD);
      const needed = MIN_MATCHES_FIRST_WEEK - existingMatchCount;
      const toMatch = eligible.slice(0, needed);

      let newMatchCount = 0;
      for (const candidate of toMatch) {
        try {
          await prisma.match.create({
            data: {
              userId: user.id,
              targetUserId: candidate.candidate.id,
              status: 'screening',
            },
          });
          newMatchCount++;
        } catch {
          // unique constraint — already exists
        }
      }

      if (newMatchCount > 0) {
        boosted++;
        results.push({ userId: user.id, newMatches: newMatchCount });
      }
    } catch {
      // Skip user on error
    }
  }

  return NextResponse.json({
    code: 0,
    data: { boosted, details: results },
  });
}

const MIN_MATCHES_FIRST_WEEK = 3;
