import { NextResponse } from "next/server";
import { getCurrentUserWithToken } from "@/lib/auth";

const BASE_URL = process.env.SECONDME_API_BASE_URL;

export async function GET() {
  const user = await getCurrentUserWithToken();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }
  const res = await fetch(`${BASE_URL}/api/secondme/user/shades`, {
    headers: { Authorization: `Bearer ${user.accessToken}` },
  });
  const data = await res.json();
  return NextResponse.json(data);
}
