import { NextRequest, NextResponse } from "next/server";
import { seedUsers } from "@/lib/seedUsers";

/**
 * POST /api/admin/seed-users
 *
 * Triggers seeding of 100 diverse realistic users for cold start & AI search testing.
 * Protected by ADMIN_SECRET env var — pass it as a Bearer token or ?secret= query param.
 *
 * Idempotent: skips users whose email already exists in the database.
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/admin/seed-users \
 *     -H "Authorization: Bearer YOUR_ADMIN_SECRET"
 *
 *   # or via query param:
 *   curl -X POST "http://localhost:3000/api/admin/seed-users?secret=YOUR_ADMIN_SECRET"
 */
export async function POST(request: NextRequest) {
  // ── Auth check ──────────────────────────────────────────────────────────────
  const adminSecret = process.env.ADMIN_SECRET;

  if (adminSecret) {
    // Check Bearer token
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.replace(/^Bearer\s+/i, "");

    // Check query param
    const url = new URL(request.url);
    const querySecret = url.searchParams.get("secret");

    const provided = bearerToken || querySecret;

    if (provided !== adminSecret) {
      return NextResponse.json(
        { code: 401, message: "未授权：请提供正确的 ADMIN_SECRET" },
        { status: 401 },
      );
    }
  }

  // ── Run seed ────────────────────────────────────────────────────────────────
  try {
    const result = await seedUsers();

    return NextResponse.json({
      code: 0,
      message: `种子用户创建完成：新建 ${result.created}，跳过 ${result.skipped}，错误 ${result.errors.length}`,
      data: {
        created: result.created,
        skipped: result.skipped,
        errors: result.errors,
        total: result.total,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[seed-users] Fatal error:", msg);
    return NextResponse.json(
      { code: 500, message: `种子用户创建失败：${msg}` },
      { status: 500 },
    );
  }
}

/**
 * GET /api/admin/seed-users
 *
 * Returns seed status info (how many seed users exist).
 */
export async function GET(request: NextRequest) {
  // Light auth check
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret) {
    const url = new URL(request.url);
    const querySecret = url.searchParams.get("secret");
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.replace(/^Bearer\s+/i, "");
    const provided = bearerToken || querySecret;

    if (provided !== adminSecret) {
      return NextResponse.json(
        { code: 401, message: "未授权：请提供正确的 ADMIN_SECRET" },
        { status: 401 },
      );
    }
  }

  try {
    const { prisma } = await import("@/lib/db");

    const seedUserCount = await prisma.user.count({
      where: { authProvider: "seed" },
    });

    const genderBreakdown = await prisma.user.groupBy({
      by: ["gender"],
      where: { authProvider: "seed" },
      _count: true,
    });

    const cityBreakdown = await prisma.userPreference.groupBy({
      by: ["region"],
      where: { user: { authProvider: "seed" } },
      _count: true,
    });

    return NextResponse.json({
      code: 0,
      data: {
        totalSeedUsers: seedUserCount,
        byGender: genderBreakdown.map((g) => ({
          gender: g.gender,
          count: g._count,
        })),
        byCity: cityBreakdown.map((c) => ({
          city: c.region,
          count: c._count,
        })),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { code: 500, message: `查询失败：${msg}` },
      { status: 500 },
    );
  }
}
