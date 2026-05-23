import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ code: 400, message: "定位数据无效" }, { status: 400 });
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ code: 400, message: "定位范围无效" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      latitude,
      longitude,
      locationUpdatedAt: new Date(),
    },
  });

  return NextResponse.json({ code: 0 });
}
