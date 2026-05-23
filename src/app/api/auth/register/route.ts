import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSessionCookieWithOptions } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { hitRateLimit } from "@/lib/rateLimit";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function genShortId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "QB";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

async function uniqueShortId(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const sid = genShortId();
    const existing = await prisma.user.findUnique({ where: { shortId: sid } });
    if (!existing) return sid;
  }
  return genShortId();
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim();
  const rememberMe = body?.rememberMe !== false;

  if (!name) {
    return NextResponse.json({ code: 400, message: "请填写你的昵称" }, { status: 400 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = hitRateLimit(`register:${ip}`, 10, 10 * 60 * 1000);
  if (rl.limited) {
    return NextResponse.json(
      { code: 429, message: "注册尝试过于频繁，请稍后再试" },
      { status: 429 }
    );
  }

  if (!isEmail(email)) {
    return NextResponse.json({ code: 400, message: "邮箱格式不正确" }, { status: 400 });
  }
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return NextResponse.json(
      { code: 400, message: "密码至少 8 位，且包含字母和数字" },
      { status: 400 }
    );
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ code: 409, message: "该邮箱已注册，请直接登录" }, { status: 409 });
  }

  const shortId = await uniqueShortId();
  const user = await prisma.user.create({
    data: {
      email,
      name,
      authProvider: "local",
      passwordHash: hashPassword(password),
      onboardingDone: false,
      shortId,
    },
  });

  setSessionCookieWithOptions(user.id, { remember: rememberMe });
  return NextResponse.json({
    code: 0,
    data: { id: user.id, email: user.email, name: user.name, authProvider: user.authProvider },
  });
}

