import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// In-memory typing status store (ephemeral, resets on server restart)
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
