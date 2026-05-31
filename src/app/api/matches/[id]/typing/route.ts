import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// In-memory typing status store.
// ⚠️ PRODUCTION LIMITATION: On Vercel/serverless, each invocation may run on
// a different instance, so this Map is NOT shared across requests. This means
// typing indicators will be unreliable on serverless platforms.
// For production, use Redis (e.g., Upstash) or a similar shared store:
//   import { Redis } from "@upstash/redis";
//   const redis = Redis.fromEnv();
//   await redis.set(`typing:${matchId}:${userId}`, "1", { ex: 5 });
// For single-instance deployments (Docker, VPS), this in-memory approach works fine.
const typingMap = new Map<string, { userId: string; timestamp: number }>();
const TYPING_TTL = 5000; // 5 seconds

function cleanup() {
  const now = Date.now();
  typingMap.forEach((val, key) => {
    if (now - val.timestamp > TYPING_TTL) typingMap.delete(key);
  });
}

function typingKey(matchId: string, userId: string) {
  return `${matchId}:${userId}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  cleanup();
  const matchId = params.id;
  const myKey = typingKey(matchId, user.id);
  const now = Date.now();
  let otherTyping = false;

  typingMap.forEach((val, key) => {
    if (key.startsWith(`${matchId}:`) && key !== myKey && now - val.timestamp < TYPING_TTL) {
      otherTyping = true;
    }
  });

  return NextResponse.json({
    code: 0,
    data: { typing: otherTyping },
  });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  cleanup();
  const matchId = params.id;
  typingMap.set(typingKey(matchId, user.id), {
    userId: user.id,
    timestamp: Date.now(),
  });

  return NextResponse.json({ code: 0 });
}
