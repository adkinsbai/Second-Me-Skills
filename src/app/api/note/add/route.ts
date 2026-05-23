import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserWithToken } from "@/lib/auth";

const BASE_URL = process.env.SECONDME_API_BASE_URL;

export async function POST(request: NextRequest) {
  const user = await getCurrentUserWithToken();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }
  const body = await request.json();
  const res = await fetch(`${BASE_URL}/api/secondme/note/add`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${user.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data);
}
