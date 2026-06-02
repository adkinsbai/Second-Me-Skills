import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withCors, handleCorsPreflightRequest } from "@/lib/api-security";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request) ?? NextResponse.next();
}

/* ────── Quiz data ────── */
const QUESTIONS: { id: number; question: string; options: [string, string]; emoji: string }[] = [
  { id: 1, question: "约会选电影院还是咖啡厅？", options: ["电影院", "咖啡厅"], emoji: "🎬" },
  { id: 2, question: "周末睡到几点？", options: ["自然醒（可能中午）", "闹钟叫醒（上午）"], emoji: "😴" },
  { id: 3, question: "理想旅行目的地？", options: ["海边度假", "城市探索"], emoji: "✈️" },
  { id: 4, question: "更喜欢猫还是狗？", options: ["猫", "狗"], emoji: "🐾" },
  { id: 5, question: "在家做饭还是出去吃？", options: ["在家做饭", "出去吃"], emoji: "🍳" },
  { id: 6, question: "喜欢早起还是熬夜？", options: ["早起型", "熬夜型"], emoji: "🌙" },
  { id: 7, question: "理想的一天？", options: ["宅在家看电影打游戏", "出门逛街运动社交"], emoji: "🏠" },
  { id: 8, question: "恋爱中最看重什么？", options: ["陪伴感", "个人空间"], emoji: "💕" },
  { id: 9, question: "遇到分歧怎么处理？", options: ["立刻说清楚", "冷静一下再说"], emoji: "💬" },
  { id: 10, question: "未来最想一起做的事？", options: ["环游世界", "一起养宠物"], emoji: "🌟" },
];

const STORAGE_PREFIX = "compatibility:";

function storageKey(matchId: string) {
  return `${STORAGE_PREFIX}${matchId}`;
}

/**
 * GET /api/matches/[id]/compatibility
 * Returns quiz questions + both users' answers (if any)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const { id: matchId } = params;
  const match = await prisma.match.findFirst({
    where: { id: matchId, userId: user.id },
    select: { id: true, userId: true, targetUserId: true },
  });
  if (!match) return NextResponse.json({ code: 404 }, { status: 404 });

  // Read stored answers from UserEvent (type = "compatibility")
  const events = await prisma.userEvent.findMany({
    where: {
      eventType: storageKey(matchId),
      userId: { in: [match.userId, match.targetUserId] },
    },
    select: { userId: true, payload: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Build answer maps
  const selfAnswers: Record<number, number> = {};
  const targetAnswers: Record<number, number> = {};

  for (const evt of events) {
    const data = evt.payload as Record<string, unknown> | null;
    if (!data || typeof data !== "object") continue;
    if ("answers" in data) {
      const answers = data.answers as Record<string, number>;
      if (evt.userId === match.userId) {
        for (const [k, v] of Object.entries(answers)) selfAnswers[Number(k)] = v;
      } else {
        for (const [k, v] of Object.entries(answers)) targetAnswers[Number(k)] = v;
      }
    }
  }

  // Check if both have answered all 10
  const selfDone = Object.keys(selfAnswers).length >= 10;
  const targetDone = Object.keys(targetAnswers).length >= 10;

  // Calculate score if both done
  let compatibilityScore: number | null = null;
  if (selfDone && targetDone) {
    let matches = 0;
    for (let i = 1; i <= 10; i++) {
      if (selfAnswers[i] === targetAnswers[i]) matches++;
    }
    compatibilityScore = Math.round((matches / 10) * 100);
  }

  return withCors(
    NextResponse.json({
      code: 0,
      data: {
        questions: QUESTIONS,
        selfAnswers,
        targetAnswers: selfDone ? targetAnswers : {}, // only reveal if self completed
        selfDone,
        targetDone,
        compatibilityScore,
      },
    }),
    request.headers.get("origin")
  );
}

/**
 * POST /api/matches/[id]/compatibility
 * Body: { answers: Record<number, number> }
 * Stores the user's answers.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const { id: matchId } = params;
  const match = await prisma.match.findFirst({
    where: { id: matchId, userId: user.id },
    select: { id: true, userId: true, targetUserId: true, status: true },
  });
  if (!match) return NextResponse.json({ code: 404 }, { status: 404 });
  if (match.status !== "connected") {
    return NextResponse.json({ code: 403, message: "请先解锁聊天" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const answers = body?.answers;
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ code: 400, message: "缺少答案" }, { status: 400 });
  }

  // Validate all 10 questions answered
  for (let i = 1; i <= 10; i++) {
    if (answers[i] !== 0 && answers[i] !== 1) {
      return NextResponse.json({ code: 400, message: `第${i}题未作答` }, { status: 400 });
    }
  }

  // Store as UserEvent
  await prisma.userEvent.create({
    data: {
      userId: user.id,
      eventType: storageKey(matchId),
      payload: { answers, matchId },
    },
  });

  // Check if the other user already answered
  const otherUserEvent = await prisma.userEvent.findFirst({
    where: {
      eventType: storageKey(matchId),
      userId: match.targetUserId,
    },
    select: { payload: true },
    orderBy: { createdAt: "desc" },
  });

  let targetAnswers: Record<number, number> = {};
  if (otherUserEvent?.payload) {
    const data = otherUserEvent.payload as Record<string, unknown>;
    if (data && "answers" in data) {
      targetAnswers = data.answers as Record<number, number>;
    }
  }

  const targetDone = Object.keys(targetAnswers).length >= 10;
  let compatibilityScore: number | null = null;
  if (targetDone) {
    let matchCount = 0;
    for (let i = 1; i <= 10; i++) {
      if ((answers as Record<number, number>)[i] === targetAnswers[i]) matchCount++;
    }
    compatibilityScore = Math.round((matchCount / 10) * 100);
  }

  return withCors(
    NextResponse.json({
      code: 0,
      data: {
        selfDone: true,
        targetDone,
        targetAnswers: targetDone ? targetAnswers : {},
        compatibilityScore,
      },
    }),
    request.headers.get("origin")
  );
}
