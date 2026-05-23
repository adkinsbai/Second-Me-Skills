import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const { id } = params;
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, avatarUrl: true, bio: true, photo1: true, photo2: true, photo3: true },
  });
  if (!target) return NextResponse.json({ code: 404 }, { status: 404 });

  return NextResponse.json({
    code: 0,
    data: {
      id: target.id,
      name: target.name ?? "未设置昵称",
      avatarUrl: target.avatarUrl,
      bio: target.bio ?? "",
      photos: [target.photo1, target.photo2, target.photo3].filter((x): x is string => !!x),
    },
  });
}

