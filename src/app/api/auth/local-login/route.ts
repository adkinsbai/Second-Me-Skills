import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { hitRateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = hitRateLimit(`login:${ip}`, 20, 10 * 60 * 1000);
  if (rl.limited) {
    return NextResponse.json(
      { code: 429, message: "登录尝试过于频繁，请稍后再试" },
      { status: 429 }
    );
  }

  if (!email || !password) {
    return NextResponse.json({ code: 400, message: "请输入邮箱和密码" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ code: 401, message: "邮箱或密码错误" }, { status: 401 });
  }

  setSessionCookie(user.id);
  return NextResponse.json({
    code: 0,
    data: { id: user.id, email: user.email, name: user.name, authProvider: user.authProvider },
  });
}

