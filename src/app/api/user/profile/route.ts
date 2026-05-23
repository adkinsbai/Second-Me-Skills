import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });

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

  return NextResponse.json({ code: 0 });
}

