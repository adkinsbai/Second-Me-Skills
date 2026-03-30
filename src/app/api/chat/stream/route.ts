import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserWithToken } from "@/lib/auth";

const BASE_URL = process.env.SECONDME_API_BASE_URL;

export async function POST(request: NextRequest) {
  const user = await getCurrentUserWithToken();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }
  const body = await request.json();
  const res = await fetch(`${BASE_URL}/api/secondme/chat/stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${user.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.body) {
    return NextResponse.json({ error: "No body" }, { status: 502 });
  }
  return new NextResponse(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
