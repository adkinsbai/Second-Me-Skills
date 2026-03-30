import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

type ThresholdMode = "conservative" | "balanced" | "open";

function mapModeToThreshold(mode: ThresholdMode): number {
  if (mode === "conservative") return 85;
  if (mode === "open") return 55;
  return 70;
}

function mapThresholdToMode(threshold: number): ThresholdMode {
  if (threshold >= 80) return "conservative";
  if (threshold <= 60) return "open";
  return "balanced";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });
  const prefs = await prisma.userPreference.findUnique({
    where: { userId: user.id },
  });
  const threshold = prefs?.heartThreshold ?? 80;
  const thresholdMode = mapThresholdToMode(threshold);

  let matchTypes: string[] = [];
  if (prefs?.matchTypes) {
    try {
      matchTypes = JSON.parse(prefs.matchTypes) as string[];
    } catch {}
  }

  let activityTags: string[] = [];
  if (prefs?.activityTags) {
    try {
      activityTags = JSON.parse(prefs.activityTags) as string[];
    } catch {}
  }

  return NextResponse.json({
    code: 0,
    data: {
      heartThreshold: threshold,
      thresholdMode,
      dailyMatchTime: prefs?.dailyMatchTime ?? "21:00",
      dailyMatchTimezone: prefs?.dailyMatchTimezone ?? "Asia/Shanghai",
      expectedGender: prefs?.expectedGender ?? "any",
      ageMin: prefs?.ageMin ?? null,
      ageMax: prefs?.ageMax ?? null,
      region: prefs?.region ?? "",
      matchTypes,
      keywords: prefs?.keywords ?? "",
      chatPace: prefs?.chatPace ?? "",
      meetPreference: prefs?.meetPreference ?? "",
      emotionStyle: prefs?.emotionStyle ?? "",
      activityTags,
    },
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });
  const body = await request.json();

  const reqMode = body.thresholdMode as ThresholdMode | undefined;
  const heartThreshold =
    reqMode && ["conservative", "balanced", "open"].includes(reqMode)
      ? mapModeToThreshold(reqMode)
      : Math.min(100, Math.max(0, Number(body.heartThreshold) ?? 80));
  const expectedGender = ["male", "female", "any"].includes(body.expectedGender)
    ? body.expectedGender
    : undefined;
  const ageMin =
    body.ageMin != null ? Math.max(0, Math.min(120, Number(body.ageMin))) : undefined;
  const ageMax =
    body.ageMax != null ? Math.max(0, Math.min(120, Number(body.ageMax))) : undefined;
  const region = typeof body.region === "string" ? body.region.slice(0, 100) : undefined;
  const matchTypes = Array.isArray(body.matchTypes)
    ? JSON.stringify(body.matchTypes.slice(0, 20))
    : undefined;
  const keywords =
    typeof body.keywords === "string" ? body.keywords.slice(0, 500) : undefined;

  const chatPace =
    ["low", "medium", "high"].includes(body.chatPace) && body.chatPace
      ? body.chatPace
      : undefined;
  const meetPreference =
    ["online", "hybrid", "offline"].includes(body.meetPreference) && body.meetPreference
      ? body.meetPreference
      : undefined;
  const emotionStyle =
    ["direct", "slow", "sensitive"].includes(body.emotionStyle) && body.emotionStyle
      ? body.emotionStyle
      : undefined;
  const activityTagsStr = Array.isArray(body.activityTags)
    ? JSON.stringify(body.activityTags.slice(0, 20))
    : undefined;

  const dailyMatchTime =
    typeof body.dailyMatchTime === "string" && /^\d{2}:\d{2}$/.test(body.dailyMatchTime)
      ? body.dailyMatchTime
      : undefined;
  const dailyMatchTimezone =
    typeof body.dailyMatchTimezone === "string" && body.dailyMatchTimezone.trim()
      ? body.dailyMatchTimezone.trim().slice(0, 50)
      : undefined;

  await prisma.userPreference.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      heartThreshold,
      dailyMatchTime: dailyMatchTime ?? "21:00",
      dailyMatchTimezone: dailyMatchTimezone ?? "Asia/Shanghai",
      expectedGender: expectedGender ?? undefined,
      ageMin: ageMin ?? undefined,
      ageMax: ageMax ?? undefined,
      region: region ?? undefined,
      matchTypes: matchTypes ?? undefined,
      keywords: keywords ?? undefined,
      chatPace: chatPace ?? undefined,
      meetPreference: meetPreference ?? undefined,
      emotionStyle: emotionStyle ?? undefined,
      activityTags: activityTagsStr ?? undefined,
    },
    update: {
      heartThreshold,
      ...(dailyMatchTime !== undefined && { dailyMatchTime }),
      ...(dailyMatchTimezone !== undefined && { dailyMatchTimezone }),
      ...(expectedGender !== undefined && { expectedGender }),
      ...(ageMin !== undefined && { ageMin }),
      ...(ageMax !== undefined && { ageMax }),
      ...(region !== undefined && { region }),
      ...(matchTypes !== undefined && { matchTypes }),
      ...(keywords !== undefined && { keywords }),
      ...(chatPace !== undefined && { chatPace }),
      ...(meetPreference !== undefined && { meetPreference }),
      ...(emotionStyle !== undefined && { emotionStyle }),
      ...(activityTagsStr !== undefined && { activityTags: activityTagsStr }),
    },
  });

  return NextResponse.json({
    code: 0,
    data: {
      heartThreshold,
      dailyMatchTime: dailyMatchTime ?? "21:00",
      dailyMatchTimezone: dailyMatchTimezone ?? "Asia/Shanghai",
      expectedGender: expectedGender ?? null,
      ageMin: ageMin ?? null,
      ageMax: ageMax ?? null,
      region: region ?? "",
      matchTypes: matchTypes ? (JSON.parse(matchTypes) as string[]) : [],
      keywords: keywords ?? "",
      chatPace: chatPace ?? "",
      meetPreference: meetPreference ?? "",
      emotionStyle: emotionStyle ?? "",
      activityTags: activityTagsStr ? (JSON.parse(activityTagsStr) as string[]) : [],
    },
  });
}
