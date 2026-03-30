import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentUserWithToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

const BASE_URL = process.env.SECONDME_API_BASE_URL;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const tokenUser = await getCurrentUserWithToken();
  if (tokenUser?.accessToken && BASE_URL) {
    try {
      const res = await fetch(`${BASE_URL}/api/secondme/user/info`, {
        headers: { Authorization: `Bearer ${tokenUser.accessToken}` },
      });
      const data = await res.json();
      if (data?.code === 0 && data?.data) return NextResponse.json(data);
    } catch {
      // fall through to local profile
    }
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, avatarUrl: true, bio: true, photo1: true, photo2: true, photo3: true },
  });
  return NextResponse.json({
    code: 0,
    data: {
      name: dbUser?.name ?? user.name ?? "未设置昵称",
      avatar: dbUser?.avatarUrl ?? user.avatarUrl ?? "",
      bio: dbUser?.bio ?? "",
      selfIntroduction: dbUser?.bio ?? "先完善资料，让对方更了解你。",
      photos: [dbUser?.photo1, dbUser?.photo2, dbUser?.photo3].filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0
      ),
    },
  });
}
