import { randomBytes, createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hitRateLimit } from "@/lib/rateLimit";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = hitRateLimit(`forgot-password:${ip}`, 10, 10 * 60 * 1000);
  if (rl.limited) {
    return NextResponse.json({ code: 429, message: "请求过于频繁，请稍后重试" }, { status: 429 });
  }

  if (!email) {
    return NextResponse.json({ code: 400, message: "请输入邮箱" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  let debugResetLink: string | null = null;
  if (user?.id) {
    const token = randomBytes(24).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpiresAt: expiresAt,
      },
    });
    debugResetLink = `/auth/reset-password?token=${token}`;
  }

  return NextResponse.json({
    code: 0,
    message: "若邮箱存在，我们已发送找回链接",
    ...(process.env.NODE_ENV !== "production" ? { debugResetLink } : {}),
  });
}
