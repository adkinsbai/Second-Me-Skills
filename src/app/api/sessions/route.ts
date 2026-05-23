import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserWithToken } from "@/lib/auth";

const BASE_URL = process.env.SECONDME_API_BASE_URL;

export async function GET(request: NextRequest) {
  const user = await getCurrentUserWithToken();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }
  const { searchParams } = request.nextUrl;
  const query = searchParams.toString();
  const url = `${BASE_URL}/api/secondme/sessions${query ? `?${query}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${user.accessToken}` },
  });
  const data = await res.json();
  return NextResponse.json(data);
}
