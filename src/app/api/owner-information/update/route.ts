import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { appendOwnerFact } from "@/lib/ownerInformation";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const body = await request.json();
  const userMessage = String(body?.userMessage ?? "").trim();

  if (!userMessage) {
    return NextResponse.json({ code: 400, message: "缺少 userMessage" }, { status: 400 });
  }

  // 把“主人的原话/事实”逐步沉淀到本地 owner_information 文件里
  await appendOwnerFact(user.id, userMessage);

  return NextResponse.json({ code: 0 });
}

