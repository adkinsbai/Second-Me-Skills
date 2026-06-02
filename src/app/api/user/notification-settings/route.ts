import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/user/notification-settings — 获取当前用户通知设置
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });

  const settings = await prisma.notificationSettings.findUnique({
    where: { userId: user.id },
  });

  // Return defaults if no settings exist
  const data = settings ?? {
    pushEnabled: true,
    quietHoursStart: 23,
    quietHoursEnd: 8,
    dailyRecommendation: true,
    reEngagement: true,
    matchNotification: true,
    messageNotification: true,
  };

  return NextResponse.json({ code: 0, data });
}

// POST /api/user/notification-settings — 更新通知设置
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  const pushEnabled = typeof body.pushEnabled === "boolean" ? body.pushEnabled : undefined;
  const quietHoursStart = typeof body.quietHoursStart === "number" && body.quietHoursStart >= 0 && body.quietHoursStart <= 23
    ? body.quietHoursStart
    : undefined;
  const quietHoursEnd = typeof body.quietHoursEnd === "number" && body.quietHoursEnd >= 0 && body.quietHoursEnd <= 23
    ? body.quietHoursEnd
    : undefined;
  const dailyRecommendation = typeof body.dailyRecommendation === "boolean" ? body.dailyRecommendation : undefined;
  const reEngagement = typeof body.reEngagement === "boolean" ? body.reEngagement : undefined;
  const matchNotification = typeof body.matchNotification === "boolean" ? body.matchNotification : undefined;
  const messageNotification = typeof body.messageNotification === "boolean" ? body.messageNotification : undefined;

  const updateData: Record<string, unknown> = {};
  if (pushEnabled !== undefined) updateData.pushEnabled = pushEnabled;
  if (quietHoursStart !== undefined) updateData.quietHoursStart = quietHoursStart;
  if (quietHoursEnd !== undefined) updateData.quietHoursEnd = quietHoursEnd;
  if (dailyRecommendation !== undefined) updateData.dailyRecommendation = dailyRecommendation;
  if (reEngagement !== undefined) updateData.reEngagement = reEngagement;
  if (matchNotification !== undefined) updateData.matchNotification = matchNotification;
  if (messageNotification !== undefined) updateData.messageNotification = messageNotification;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ code: 400, message: "没有可更新的字段" }, { status: 400 });
  }

  const settings = await prisma.notificationSettings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      ...updateData,
    },
    update: updateData,
  });

  return NextResponse.json({ code: 0, data: settings });
}
