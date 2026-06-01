import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateLimitResponse, withCors, handleCorsPreflightRequest, validateContentType } from "@/lib/api-security";

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request) ?? NextResponse.next();
}

export async function POST(request: NextRequest) {
  // CORS preflight
  const corsPreflight = handleCorsPreflightRequest(request);
  if (corsPreflight) return corsPreflight;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });

  // Rate limit: 20 profile updates per 10 minutes per IP
  const rlResponse = rateLimitResponse(request, "profile-update", 20, 10 * 60 * 1000);
  if (rlResponse) return rlResponse;

  if (!validateContentType(request)) {
    return withCors(
      NextResponse.json({ code: 400, message: "无效的 Content-Type" }, { status: 400 }),
      request.headers.get("origin")
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 50) : "";
  const bio = typeof body?.bio === "string" ? body.bio.trim().slice(0, 300) : "";
  const avatarUrl =
    typeof body?.avatarUrl === "string" ? body.avatarUrl.trim().slice(0, 500) : "";
  const photo1 = typeof body?.photo1 === "string" ? body.photo1 : null;
  const photo2 = typeof body?.photo2 === "string" ? body.photo2 : null;
  const photo3 = typeof body?.photo3 === "string" ? body.photo3 : null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(name ? { name } : {}),
      bio,
      avatarUrl: avatarUrl || null,
      photo1,
      photo2,
      photo3,
    },
  });

  return withCors(
    NextResponse.json({ code: 0, message: "保存成功" }),
    request.headers.get("origin")
  );
}

