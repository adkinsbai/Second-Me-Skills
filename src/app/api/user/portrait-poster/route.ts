import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePortraitPoster } from "@/lib/posterGenerator";
import { generateInviteCode } from "@/lib/inviteCodes";

/**
 * GET /api/user/portrait-poster
 * Returns the poster as an HTML page that can be screenshotted / shared.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });
  }

  const userId = user.id;

  const [matchingProfile, preference, preferenceSignal, matchCount, inviteCode] = await Promise.all([
    prisma.userMatchingProfile.findUnique({ where: { userId } }),
    prisma.userPreference.findUnique({ where: { userId } }),
    prisma.userPreferenceSignal.findUnique({ where: { userId } }),
    prisma.match.count({ where: { userId } }),
    generateInviteCode(userId),
  ]);

  const summaryJson = (matchingProfile?.summaryJson ?? {}) as Record<string, unknown>;
  const traitsJson = (matchingProfile?.traitsJson ?? {}) as Record<string, unknown>;

  const goalMap: Record<string, string> = {
    marriage: "以结婚为目标",
    romance: "寻找认真恋爱",
    soulmate: "寻找灵魂伴侣",
    companion: "寻找陪伴搭子",
    unknown: "暂未明确",
  };
  const paceMap: Record<string, string> = { low: "慢节奏", medium: "适中", high: "快节奏" };
  const talkStyleMap: Record<string, string> = {
    rational: "理性逻辑型",
    emotional: "感性共情型",
    humor: "幽默风趣型",
    sharp: "犀利直接型",
    balanced: "平衡型",
  };

  function parseTagsFromJson(raw: unknown): { tag: string; count: number }[] {
    if (!raw || typeof raw !== "object") return [];
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.tags)) return obj.tags as { tag: string; count: number }[];
    return [];
  }

  const posterData = {
    name: user.name ?? "丘比用户",
    personality: {
      relationshipGoal: goalMap[String(summaryJson.relationshipGoal ?? "")] ?? "暂未明确",
      communicationPace: paceMap[String(summaryJson.communicationPace ?? "")] ?? "适中",
      talkStyle: talkStyleMap[String(summaryJson.talkStyle ?? "")] ?? "平衡型",
      valuePriority: (traitsJson.valuePriority as { career: number; family: number; freedom: number; growth: number }) ?? null,
      topicPref: (traitsJson.topicPref as { life: number; emotion: number; work: number; entertainment: number }) ?? null,
      qualityFlags: Array.isArray(summaryJson.qualityFlags) ? (summaryJson.qualityFlags as string[]) : [],
    },
    preferences: {
      expectedGender: preference?.expectedGender ?? null,
      ageRange: preference?.ageMin && preference?.ageMax ? `${preference.ageMin}-${preference.ageMax}岁` : null,
      region: preference?.region ?? null,
      matchTypes: preference?.matchTypes ?? null,
      chatPace: preference?.chatPace ?? null,
      meetPreference: preference?.meetPreference ?? null,
      emotionStyle: preference?.emotionStyle ?? null,
    },
    idealPartner: {
      likedTraits: parseTagsFromJson(preferenceSignal?.likedTraitsJson).slice(0, 8),
      unlikedTraits: parseTagsFromJson(preferenceSignal?.unlikedTraitsJson).slice(0, 8),
    },
    matchCount,
    inviteCode,
  };

  const html = generatePortraitPoster(posterData);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
