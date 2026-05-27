import { NextRequest, NextResponse } from "next/server";
import { refreshActiveUsers } from "@/lib/profileRefresh";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ code: 401, message: "未授权" }, { status: 401 });
  }

  const userId = request.nextUrl.searchParams.get("userId") ?? undefined;
  const result = await refreshActiveUsers(undefined, userId);
  return NextResponse.json({ code: 0, data: result });
}
