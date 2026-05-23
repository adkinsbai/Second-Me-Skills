import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { hitRateLimit } from "@/lib/rateLimit";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function isStrongPassword(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token = String(body?.token ?? "").trim();
  const password = String(body?.password ?? "");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = hitRateLimit(`reset-password:${ip}`, 20, 10 * 60 * 1000);
  if (rl.limited) {
    return NextResponse.json({ code: 429, message: "请求过于频繁，请稍后重试" }, { status: 429 });
  }

  if (!token) {
    return NextResponse.json({ code: 400, message: "链接无效，请重新获取" }, { status: 400 });
  }
  if (!isStrongPassword(password)) {
    return NextResponse.json({ code: 400, message: "密码至少 8 位，且包含字母和数字" }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const user = await prisma.user.findFirst({
    where: {
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ code: 400, message: "链接已失效，请重新获取" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(password),
      resetPasswordTokenHash: null,
      resetPasswordExpiresAt: null,
    },
  });

  return NextResponse.json({ code: 0, message: "密码重置成功，请重新登录" });
}
