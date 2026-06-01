import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, clearSessionCookie } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * POST /api/user/delete-account
 * Body: { password: string, reason?: string, mode: "soft" | "hard" }
 *
 * Soft delete: anonymize personal data, set deletedAt
 * Hard delete: cascade-delete all user data via Prisma relations
 *
 * 个保法 / PIPL — 账号注销
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const password = String(body?.password ?? "");
    const reason = String(body?.reason ?? "").trim() || undefined;
    const mode = body?.mode === "hard" ? "hard" : "soft";

    if (!password) {
      return NextResponse.json(
        { code: 400, message: "请输入密码以确认操作" },
        { status: 400 }
      );
    }

    // Fetch full user record to verify password
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return NextResponse.json({ code: 404, message: "用户不存在" }, { status: 404 });
    }

    if (dbUser.deletedAt) {
      return NextResponse.json(
        { code: 400, message: "该账号已注销" },
        { status: 400 }
      );
    }

    // Password verification
    if (dbUser.authProvider === "local") {
      if (!dbUser.passwordHash || !verifyPassword(password, dbUser.passwordHash)) {
        return NextResponse.json({ code: 401, message: "密码错误" }, { status: 401 });
      }
    }
    // For SecondMe/OAuth users, we accept any non-empty password as confirmation
    // since they don't have a local password. In production you'd want a
    // separate confirmation flow (e.g. email OTP).

    if (mode === "soft") {
      // Soft delete: anonymize personal data, keep match/chat history for others
      await prisma.user.update({
        where: { id: user.id },
        data: {
          deletedAt: new Date(),
          deletionReason: reason,
          name: "已注销用户",
          avatarUrl: null,
          bio: null,
          photo1: null,
          photo2: null,
          photo3: null,
          email: `deleted_${user.id}@deleted.local`,
          passwordHash: null,
          accessToken: null,
          refreshToken: null,
          tokenExpiresAt: null,
          latitude: null,
          longitude: null,
          locationUpdatedAt: null,
          profileAnswers: Prisma.DbNull,
          resetPasswordTokenHash: null,
          resetPasswordExpiresAt: null,
        },
      });

      // Delete embeddings & matching profiles (contain personal traits)
      await prisma.userEmbedding.deleteMany({ where: { userId: user.id } }).catch(() => {});
      await prisma.userMatchingProfile.deleteMany({ where: { userId: user.id } }).catch(() => {});
      await prisma.userPreferenceSignal.deleteMany({ where: { userId: user.id } }).catch(() => {});
      await prisma.ownerFact.deleteMany({ where: { userId: user.id } }).catch(() => {});
      await prisma.profilePrompt.deleteMany({ where: { userId: user.id } }).catch(() => {});
      await prisma.pushSubscription.deleteMany({ where: { userId: user.id } }).catch(() => {});
      await prisma.userPreference.deleteMany({ where: { userId: user.id } }).catch(() => {});

      // Revoke all sessions
      await prisma.session.deleteMany({ where: { userId: user.id } }).catch(() => {});
    } else {
      // Hard delete: cascade everything
      // Prisma onDelete: Cascade handles most relations automatically.
      // Explicitly delete non-cascading relations first.
      await prisma.userEvent.deleteMany({ where: { userId: user.id } }).catch(() => {});
      await prisma.inviteCode.updateMany({ where: { usedById: user.id }, data: { usedById: null } }).catch(() => {});
      await prisma.session.deleteMany({ where: { userId: user.id } }).catch(() => {});
      await prisma.pushSubscription.deleteMany({ where: { userId: user.id } }).catch(() => {});

      // Now delete the user — cascade deletes all remaining relations
      await prisma.user.delete({ where: { id: user.id } });
    }

    // Clear session cookie
    clearSessionCookie();

    return NextResponse.json({
      code: 0,
      message: mode === "soft" ? "账号已注销，个人数据已匿名化" : "账号及所有数据已永久删除",
    });
  } catch (err) {
    console.error("[delete-account]", err);
    return NextResponse.json(
      { code: 500, message: "注销失败，请稍后再试" },
      { status: 500 }
    );
  }
}
