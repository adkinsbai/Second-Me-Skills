import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateInviteCode, redeemInviteCode, getInviteStats } from "@/lib/inviteCodes";

/**
 * GET /api/user/invite
 * Returns the current user's invite code and stats.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    // Ensure user has a code
    await generateInviteCode(user.id);
    const stats = await getInviteStats(user.id);
    return NextResponse.json({ code: 0, data: stats });
  } catch (err) {
    console.error("[invite GET]", err);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}

/**
 * POST /api/user/invite
 * Use someone else's invite code.
 * Body: { code: string }
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { code } = body as { code?: string };

    if (!code || typeof code !== "string" || code.trim().length < 4) {
      return NextResponse.json({ code: 400, message: "请输入有效的邀请码" }, { status: 400 });
    }

    const result = await redeemInviteCode(code, user.id);

    if (!result.success) {
      return NextResponse.json({ code: 400, message: result.message }, { status: 400 });
    }

    return NextResponse.json({ code: 0, message: result.message });
  } catch (err) {
    console.error("[invite POST]", err);
    return NextResponse.json({ code: 500, message: "服务器错误" }, { status: 500 });
  }
}
