import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

function parseJsonValue(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  return raw as Record<string, unknown>;
}

function parseTagsFromJson(raw: unknown): { tag: string; count: number }[] {
  const obj = parseJsonValue(raw);
  if (Array.isArray(obj.tags)) {
    return obj.tags as { tag: string; count: number }[];
  }
  return [];
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const userId = user.id;

  const [ownerFacts, matchingProfile, preference, preferenceSignal] = await Promise.all([
    prisma.ownerFact.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { content: true, source: true, createdAt: true },
    }),
    prisma.userMatchingProfile.findUnique({
      where: { userId },
    }),
    prisma.userPreference.findUnique({
      where: { userId },
    }),
    prisma.userPreferenceSignal.findUnique({
      where: { userId },
    }),
  ]);

  const summaryJson = parseJsonValue(matchingProfile?.summaryJson);
  const traitsJson = parseJsonValue(matchingProfile?.traitsJson);
  const signalsJson = parseJsonValue(matchingProfile?.signalsJson);

  const likedTraits = parseTagsFromJson(preferenceSignal?.likedTraitsJson);
  const unlikedTraits = parseTagsFromJson(preferenceSignal?.unlikedTraitsJson);

  const goalMap: Record<string, string> = {
    marriage: "以结婚为目标",
    romance: "寻找认真恋爱",
    soulmate: "寻找灵魂伴侣",
    companion: "寻找陪伴搭子",
    unknown: "暂未明确",
  };
  const paceMap: Record<string, string> = {
    low: "慢节奏",
    medium: "适中",
    high: "快节奏",
  };
  const talkStyleMap: Record<string, string> = {
    rational: "理性逻辑型",
    emotional: "感性共情型",
    humor: "幽默风趣型",
    sharp: "犀利直接型",
    balanced: "平衡型",
  };

  const personality = {
    relationshipGoal: goalMap[String(summaryJson.relationshipGoal ?? "")] ?? "暂未明确",
    communicationPace: paceMap[String(summaryJson.communicationPace ?? "")] ?? "适中",
    talkStyle: talkStyleMap[String(summaryJson.talkStyle ?? "")] ?? "平衡型",
    valuePriority: traitsJson.valuePriority ?? null,
    topicPref: traitsJson.topicPref ?? null,
    qualityFlags: Array.isArray(summaryJson.qualityFlags) ? summaryJson.qualityFlags : [],
  };

  const preferenceData = {
    expectedGender: preference?.expectedGender ?? null,
    ageRange: preference?.ageMin && preference?.ageMax ? `${preference.ageMin}-${preference.ageMax}岁` : null,
    region: preference?.region ?? null,
    matchTypes: preference?.matchTypes ?? null,
    chatPace: preference?.chatPace ?? null,
    meetPreference: preference?.meetPreference ?? null,
    emotionStyle: preference?.emotionStyle ?? null,
    activityTags: preference?.activityTags ?? null,
    keywords: preference?.keywords ?? null,
  };

  const idealPartner = {
    likedTraits: likedTraits.slice(0, 10),
    unlikedTraits: unlikedTraits.slice(0, 10),
  };

  const dataCounts = {
    factsCount: ownerFacts.length,
    hasProfile: !!matchingProfile,
    hasSignals: !!preferenceSignal,
    hasPreferences: !!preference,
    lastRefreshedAt: matchingProfile?.lastRefreshedAt?.toISOString() ?? null,
    signals: signalsJson,
  };

  return NextResponse.json({
    code: 0,
    data: {
      userFacts: ownerFacts.map((f) => ({ content: f.content, source: f.source, createdAt: f.createdAt.toISOString() })),
      personality,
      preferences: preferenceData,
      idealPartner,
      dataCounts,
    },
  });
}
