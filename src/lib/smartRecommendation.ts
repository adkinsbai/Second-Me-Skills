import { prisma } from "@/lib/db";
import type { User, UserPreference, UserPreferenceSignal, UserMatchingProfile } from "@prisma/client";
import {
  passesMutualPreferenceFilters,
  type MatchPipelineResult,
  type PipelineStageStat,
} from "@/lib/matchPipeline";
import { inferUserModel, scoreCompatibility, type UserModel } from "@/lib/userModeling";
import {
  candidateSignalTags,
  weightedTagsFromJson,
} from "@/lib/preferenceSignals";
import { parseArray } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type UserFull = User & {
  preference: UserPreference | null;
  preferenceSignal: UserPreferenceSignal | null;
  matchingProfile: UserMatchingProfile | null;
};

type PopularityTier = 1 | 2 | 3;

type ScoredCandidate = {
  candidate: UserFull;
  targetModel: UserModel;
  scored: ReturnType<typeof scoreCompatibility>;
  bidirectionalScore: number;
  distanceScore: number;
  popularityScore: number;
  activityScore: number;
  finalSmartScore: number;
  tier: PopularityTier;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_SCAN = 500;
const DEFAULT_LIMIT = 20;

// Base scoring weights
const W_BIDIRECTIONAL = 0.4;
const W_DISTANCE = 0.25;
const W_POPULARITY = 0.2;
const W_ACTIVITY = 0.15;

// Tier allocation ratios
const TIER1_SAME_TIER = 0.7;
const TIER1_TIER2 = 0.2;
const TIER1_TIER3_SURPRISE = 0.1;

const TIER2_SAME_OR_ABOVE = 0.5;
const TIER2_PREFERENCE_MATCHED = 0.5;

// Time thresholds
const ACTIVE_DAYS = 7;
const INACTIVE_DAYS = 30;

// ─── Utility ─────────────────────────────────────────────────────────────────

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

// ─── Haversine Distance ──────────────────────────────────────────────────────

export function calculateDistanceScore(
  lat1: number | null | undefined,
  lng1: number | null | undefined,
  lat2: number | null | undefined,
  lng2: number | null | undefined,
): number {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
    return 0.5; // neutral score when location unknown
  }
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Score: 1.0 at 0km, 0.5 at 25km, ~0.2 at 100km, ~0 at 500km+
  if (km <= 1) return 1.0;
  if (km <= 5) return 0.95;
  if (km <= 10) return 0.85;
  if (km <= 25) return 0.7;
  if (km <= 50) return 0.5;
  if (km <= 100) return 0.3;
  if (km <= 200) return 0.15;
  return Math.max(0, 0.08 - (km - 200) * 0.0001);
}

export function haversineKm(
  lat1: number | null | undefined,
  lng1: number | null | undefined,
  lat2: number | null | undefined,
  lng2: number | null | undefined,
): number | null {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ─── Popularity Tier ─────────────────────────────────────────────────────────

export function getPopularityTier(
  popularityScore: number,
  viewCount: number,
  allScores: { popularityScore: number; viewCount: number }[],
): PopularityTier {
  // Composite popularity metric
  const composite = popularityScore + viewCount * 0.3;
  const allComposites = allScores.map((s) => s.popularityScore + s.viewCount * 0.3).sort((a, b) => a - b);

  if (allComposites.length === 0) return 2;

  const p20 = allComposites[Math.floor(allComposites.length * 0.2)] ?? 0;
  const p80 = allComposites[Math.floor(allComposites.length * 0.8)] ?? 0;

  if (composite >= p80 && p80 > 0) return 1;
  if (composite <= p20) return 3;
  return 2;
}

// ─── Bidirectional Preference Score ──────────────────────────────────────────

/**
 * Calculate how well `candidate` matches `user`'s preferences.
 * Sources: explicit preferences (UserPreference), swipe signals (UserPreferenceSignal),
 * and matching profile traits (UserMatchingProfile).
 */
function calculateOneWayInterest(
  user: UserFull,
  candidate: UserFull,
  candidateTags: string[],
): number {
  let score = 0;
  let maxScore = 0;

  // 1. Explicit gender preference (hard filter already applied, but give bonus)
  const userPref = user.preference;
  if (userPref?.expectedGender) {
    const expected = userPref.expectedGender.toLowerCase();
    const candGender = (candidate.gender ?? "").toLowerCase();
    if (expected === "any" || !expected) {
      // no preference, neutral
    } else if (
      (expected === "male" && candGender === "male") ||
      (expected === "female" && candGender === "female")
    ) {
      score += 15;
    }
    maxScore += 15;
  }

  // 2. Age preference
  if (userPref?.ageMin != null && userPref?.ageMax != null && candidate.age != null) {
    const range = userPref.ageMax - userPref.ageMin;
    const midpoint = (userPref.ageMin + userPref.ageMax) / 2;
    const distance = Math.abs(candidate.age - midpoint);
    const ageScore = range > 0 ? clamp(15 * (1 - distance / (range / 2 + 1))) : 10;
    score += ageScore;
    maxScore += 15;
  }

  // 3. Region match
  if (userPref?.region && candidate.preference?.region) {
    const sameRegion =
      userPref.region.trim().toLowerCase() === candidate.preference.region.trim().toLowerCase();
    if (sameRegion) score += 10;
    maxScore += 10;
  }

  // 4. Match type overlap
  const userMatchTypes = parseArray(userPref?.matchTypes);
  const candMatchTypes = parseArray(candidate.preference?.matchTypes);
  if (userMatchTypes.length > 0 && candMatchTypes.length > 0) {
    const candSet = new Set(candMatchTypes.map((x) => x.toLowerCase()));
    const overlap = userMatchTypes.filter((x) => candSet.has(x.toLowerCase())).length;
    score += (overlap / Math.max(userMatchTypes.length, 1)) * 15;
    maxScore += 15;
  }

  // 5. Activity tag overlap
  const userActivities = parseArray(userPref?.activityTags);
  const candActivities = parseArray(candidate.preference?.activityTags);
  if (userActivities.length > 0 && candActivities.length > 0) {
    const candSet = new Set(candActivities.map((x) => x.toLowerCase()));
    const overlap = userActivities.filter((x) => candSet.has(x.toLowerCase())).length;
    score += (overlap / Math.max(userActivities.length, 1)) * 10;
    maxScore += 10;
  }

  // 6. Keyword overlap
  const userKeywords = parseArray(userPref?.keywords);
  if (userKeywords.length > 0) {
    const candSet = new Set(
      [
        ...parseArray(candidate.preference?.keywords),
        ...parseArray(candidate.preference?.matchTypes),
        ...parseArray(candidate.preference?.activityTags),
      ].map((x) => x.toLowerCase()),
    );
    const overlap = userKeywords.filter((x) => candSet.has(x.toLowerCase())).length;
    score += (overlap / Math.max(userKeywords.length, 1)) * 10;
    maxScore += 10;
  }

  // 7. Swipe signal (liked/unliked traits from candidate's tags)
  const signal = user.preferenceSignal;
  if (signal) {
    const likedArr = weightedTagsFromJson(signal.likedTraitsJson);
    const unlikedArr = weightedTagsFromJson(signal.unlikedTraitsJson);
    const likedTags: Map<string, number> = new Map(likedArr.map((t) => [t.tag.toLowerCase(), t.count] as [string, number]));
    const unlikedTags: Map<string, number> = new Map(unlikedArr.map((t) => [t.tag.toLowerCase(), t.count] as [string, number]));

    if (likedTags.size > 0 || unlikedTags.size > 0) {
      let signalScore = 0;
      for (const tag of candidateTags) {
        const key = tag.toLowerCase();
        const liked: number = likedTags.get(key) ?? 0;
        const unliked: number = unlikedTags.get(key) ?? 0;
        signalScore += liked * 4;
        signalScore -= unliked * 5;
      }
      // Normalize signal score into [0, 25] range
      score += clamp(signalScore, -10, 25);
      maxScore += 25;
    }
  }

  // 8. Matching profile traits overlap
  if (user.matchingProfile?.traitsJson) {
      const userTraits = weightedTagsFromJson(user.matchingProfile.traitsJson);
    if (userTraits.length > 0) {
      const traitSet: Map<string, number> = new Map(userTraits.map((t) => [t.tag.toLowerCase(), t.count] as [string, number]));
      let traitOverlap = 0;
      for (const tag of candidateTags) {
        if (traitSet.has(tag.toLowerCase())) traitOverlap++;
      }
      score += (traitOverlap / Math.max(traitSet.size, 1)) * 15;
      maxScore += 15;
    }
  }

  if (maxScore === 0) return 0.5; // no preference data = neutral
  return clamp(score / maxScore, 0, 1);
}

/**
 * Bidirectional interest = harmonic mean of (myInterest, theirInterest).
 * This ensures both sides are interested, preventing one-sided matches.
 */
export function calculateBidirectionalScore(
  user: UserFull,
  candidate: UserFull,
): number {
  // Pre-compute candidate's signal tags once
  const candTags = candidateSignalTags(candidate);

  const myInterest = calculateOneWayInterest(user, candidate, candTags);

  // For "theirInterest", reverse the roles: does the candidate like what I offer?
  const myTags = candidateSignalTags(user);
  const theirInterest = calculateOneWayInterest(candidate, user, myTags);

  // Harmonic mean: 2ab / (a + b), with epsilon to avoid division by zero
  const eps = 0.001;
  const harmonic = (2 * myInterest * theirInterest) / (myInterest + theirInterest + eps);

  return clamp(harmonic);
}

// ─── Activity Score ──────────────────────────────────────────────────────────

function calculateActivityScore(updatedAt: Date): number {
  const now = Date.now();
  const daysSinceUpdate = (now - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceUpdate <= 1) return 1.0;
  if (daysSinceUpdate <= ACTIVE_DAYS) return 0.85;
  if (daysSinceUpdate <= 14) return 0.6;
  if (daysSinceUpdate <= INACTIVE_DAYS) return 0.3;
  return 0.1; // heavily penalize inactive users
}

// ─── Popularity Score (for candidate) ────────────────────────────────────────

function normalizeCandidatePopularity(
  candidate: UserFull,
  allScores: { popularityScore: number; viewCount: number }[],
): number {
  const tier = getPopularityTier(candidate.popularityScore, candidate.viewCount, allScores);
  // Tier 1: 0.8-1.0, Tier 2: 0.4-0.7, Tier 3: 0.1-0.4
  switch (tier) {
    case 1:
      return 0.8 + (candidate.popularityScore / Math.max(...allScores.map((s) => s.popularityScore), 1)) * 0.2;
    case 3:
      return 0.1 + (candidate.popularityScore / Math.max(...allScores.map((s) => s.popularityScore), 1)) * 0.3;
    default:
      return 0.4 + (candidate.popularityScore / Math.max(...allScores.map((s) => s.popularityScore), 1)) * 0.3;
  }
}

// ─── Tier Allocation ─────────────────────────────────────────────────────────

function shouldIncludeByTier(
  selfTier: PopularityTier,
  candidateTier: PopularityTier,
  random01: number,
): boolean {
  switch (selfTier) {
    case 1:
      // 70% same-tier, 20% tier 2, 10% tier 3 surprise
      if (candidateTier === 1) return random01 < TIER1_SAME_TIER;
      if (candidateTier === 2) return random01 < TIER1_SAME_TIER + TIER1_TIER2;
      return random01 < TIER1_SAME_TIER + TIER1_TIER2 + TIER1_TIER3_SURPRISE;

    case 2:
      // 50% tier 1-2, 50% preference-matched (any tier)
      if (candidateTier <= 2) return true; // always include tier 1-2
      return random01 < TIER2_PREFERENCE_MATCHED;

    case 3:
      // 100% preference-matched — everyone is fair game
      return true;

    default:
      return true;
  }
}

// ─── Main Recommendation Function ────────────────────────────────────────────

export async function getSmartRecommendations(
  userId: string,
  limit: number = DEFAULT_LIMIT,
): Promise<MatchPipelineResult> {
  // 1. Fetch self with all relations
  const self = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      preference: true,
      preferenceSignal: true,
      matchingProfile: true,
    },
  });

  if (!self) {
    return {
      stages: [],
      ranked: [],
      selfModel: inferUserModel({
        userId,
        bio: null,
        ownerFacts: [],
        userMessages: [],
        userMessageCreatedAt: [],
      }),
      dimensions: [],
      infoSources: [],
    };
  }

  // 2. Build self model (same as matchPipeline)
  const selfFactsRows = await prisma.ownerFact.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { content: true },
  });
  const selfMsgRows = await prisma.matchMessage.findMany({
    where: { senderType: "user_self", match: { userId } },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { content: true, createdAt: true },
  });

  const selfModel = inferUserModel({
    userId,
    bio: self.bio,
    keywords: self.preference?.keywords ?? null,
    matchTypes: self.preference?.matchTypes ?? null,
    chatPace: self.preference?.chatPace ?? null,
    meetPreference: self.preference?.meetPreference ?? null,
    emotionStyle: self.preference?.emotionStyle ?? null,
    activityTags: self.preference?.activityTags ?? null,
    ownerFacts: selfFactsRows.map((x) => x.content),
    userMessages: selfMsgRows.map((x) => x.content),
    userMessageCreatedAt: selfMsgRows.map((x) => x.createdAt),
  });

  // 3. Fetch exclusion set (already matched or swiped)
  const [matched, swiped] = await Promise.all([
    prisma.match.findMany({
      where: { userId },
      select: { targetUserId: true },
    }),
    prisma.userSwipeDecision.findMany({
      where: { viewerId: userId },
      select: { targetUserId: true },
    }),
  ]);

  const excludeIds = new Set([
    userId,
    ...matched.map((m) => m.targetUserId),
    ...swiped.map((s) => s.targetUserId),
  ]);

  // 4. Fetch candidate pool (batch query)
  const pool = await prisma.user.findMany({
    where: {
      id: { notIn: Array.from(excludeIds) },
      NOT: { authProvider: "guest" },
      deletedAt: null,
    },
    include: {
      preference: true,
      preferenceSignal: true,
      matchingProfile: true,
    },
    orderBy: { updatedAt: "desc" },
    take: MAX_SCAN,
  });

  const active = pool.filter((u) => u.authProvider && u.authProvider.length > 0);
  const mutual = active.filter((candidate) =>
    passesMutualPreferenceFilters(self as UserFull, candidate as UserFull),
  );

  // 5. Batch-fetch owner facts and messages for all candidates (N+1 fix)
  const candidateIds = mutual.map((c) => c.id);
  const [allFactsRows, allMsgRows] = await Promise.all([
    prisma.ownerFact.findMany({
      where: { userId: { in: candidateIds } },
      orderBy: { createdAt: "desc" },
      select: { userId: true, content: true },
    }),
    prisma.matchMessage.findMany({
      where: { senderType: "user_self", match: { userId: { in: candidateIds } } },
      orderBy: { createdAt: "desc" },
      select: { content: true, createdAt: true, match: { select: { userId: true } } },
    }),
  ]);

  const factsByUser = new Map<string, string[]>();
  for (const row of allFactsRows) {
    const list = factsByUser.get(row.userId);
    if (!list) {
      factsByUser.set(row.userId, [row.content]);
    } else if (list.length < 20) {
      list.push(row.content);
    }
  }

  const msgsByUser = new Map<string, { content: string; createdAt: Date }[]>();
  for (const row of allMsgRows) {
    const uid = row.match.userId;
    const list = msgsByUser.get(uid);
    if (!list) {
      msgsByUser.set(uid, [{ content: row.content, createdAt: row.createdAt }]);
    } else if (list.length < 30) {
      list.push({ content: row.content, createdAt: row.createdAt });
    }
  }

  // 6. Compute popularity tiers for all candidates
  const allPopularityData = mutual.map((c) => ({
    popularityScore: c.popularityScore,
    viewCount: c.viewCount,
  }));
  // Include self for tier calculation
  allPopularityData.push({
    popularityScore: self.popularityScore,
    viewCount: self.viewCount,
  });

  const selfTier = getPopularityTier(self.popularityScore, self.viewCount, allPopularityData);

  // 7. Score all candidates
  const scoredRaw: ScoredCandidate[] = [];

  for (const candidate of mutual) {
    const factsContents = factsByUser.get(candidate.id) ?? [];
    const msgEntries = msgsByUser.get(candidate.id) ?? [];

    const targetModel = inferUserModel({
      userId: candidate.id,
      bio: candidate.bio,
      keywords: candidate.preference?.keywords ?? null,
      matchTypes: candidate.preference?.matchTypes ?? null,
      chatPace: candidate.preference?.chatPace ?? null,
      meetPreference: candidate.preference?.meetPreference ?? null,
      emotionStyle: candidate.preference?.emotionStyle ?? null,
      activityTags: candidate.preference?.activityTags ?? null,
      ownerFacts: factsContents,
      userMessages: msgEntries.map((x) => x.content),
      userMessageCreatedAt: msgEntries.map((x) => x.createdAt),
    });

    const scored = scoreCompatibility(selfModel, targetModel);
    if (scored.hardRejectReasons.length > 0) continue;

    // Bidirectional preference score (0-100)
    const biScore = calculateBidirectionalScore(self as UserFull, candidate as UserFull) * 100;

    // Distance score (0-100)
    const distScore =
      calculateDistanceScore(self.latitude, self.longitude, candidate.latitude, candidate.longitude) * 100;

    // Popularity score (0-100)
    const popScore = normalizeCandidatePopularity(candidate as UserFull, allPopularityData) * 100;

    // Activity score (0-100)
    const actScore = calculateActivityScore(candidate.updatedAt) * 100;

    const candidateTier = getPopularityTier(
      candidate.popularityScore,
      candidate.viewCount,
      allPopularityData,
    );

    // Base final score
    const baseScore =
      biScore * W_BIDIRECTIONAL +
      distScore * W_DISTANCE +
      popScore * W_POPULARITY +
      actScore * W_ACTIVITY;

    scoredRaw.push({
      candidate: candidate as UserFull,
      targetModel,
      scored,
      bidirectionalScore: biScore,
      distanceScore: distScore,
      popularityScore: popScore,
      activityScore: actScore,
      finalSmartScore: baseScore,
      tier: candidateTier,
    });
  }

  // 8. Apply popularity stratification
  const selfTierStratified = selfTier;

  // For tier 1 users, apply tier-based allocation
  // For tier 2 and 3, rely more on preference matching
  const stratified = scoredRaw
    .map((item) => {
      const rand = Math.random();
      const tierOk = shouldIncludeByTier(selfTierStratified, item.tier, rand);

      // Apply tier boost/penalty to final score instead of hard filtering
      let tierAdjustment = 0;
      if (selfTierStratified === 1) {
        // Tier 1 users: slight boost for same tier, neutral for others
        if (item.tier === 1) tierAdjustment = 5;
        else if (item.tier === 2) tierAdjustment = 0;
        else tierAdjustment = -3; // slight penalty for tier 3 (but still included as "surprise")
      } else if (selfTierStratified === 2) {
        // Tier 2 users: boost for preference-matched tier 3 (the "preference crossover" benefit)
        if (item.tier === 3 && item.bidirectionalScore > 60) tierAdjustment = 8;
        else tierAdjustment = 0;
      } else {
        // Tier 3 users: strong preference matching boost
        if (item.bidirectionalScore > 50) tierAdjustment = 10;
      }

      return {
        ...item,
        finalSmartScore: item.finalSmartScore + tierAdjustment,
        tierIncluded: tierOk,
      };
    })
    .filter((item) => {
      // Always include if high bidirectional score (mutual interest trumps tier rules)
      if (item.bidirectionalScore >= 60) return true;
      return item.tierIncluded;
    });

  // 9. Also incorporate old compatibility score as a factor
  const withCompatBoost = stratified.map((item) => ({
    ...item,
    finalSmartScore: item.finalSmartScore + item.scored.finalScore * 0.15,
  }));

  // 10. Sort by final smart score
  withCompatBoost.sort((a, b) => b.finalSmartScore - a.finalSmartScore);

  // 11. Build pipeline result
  const stages: PipelineStageStat[] = [
    {
      id: "pool",
      title: "候选池扫描",
      detail: `从可匹配用户中取样，最多扫描 ${MAX_SCAN} 人。`,
      count: pool.length,
    },
    {
      id: "active",
      title: "有效账号",
      detail: "排除游客试用号和已删除账号。",
      count: active.length,
    },
    {
      id: "mutual_prefs",
      title: "双向偏好过滤",
      detail: "检查地区、年龄、性别期待和关系类型是否存在明显冲突。",
      count: mutual.length,
    },
    {
      id: "smart_score",
      title: "智能评分",
      detail: "双向偏好交叉、距离、受欢迎度、活跃度多维度评分。",
      count: scoredRaw.length,
    },
    {
      id: "stratified",
      title: "分层排序",
      detail: `用户分层：${selfTierStratified === 1 ? "高人气" : selfTierStratified === 2 ? "中人气" : "新用户/低人气"}，应用分层推荐策略。`,
      count: withCompatBoost.length,
    },
    {
      id: "ranked",
      title: "推荐排序",
      detail: "按综合智能评分排序，挑出本轮最值得认识的人。",
      count: Math.min(withCompatBoost.length, limit),
    },
  ];

  const ranked = withCompatBoost.slice(0, limit);

  return {
    stages,
    ranked: ranked.map((item) => ({
      candidate: item.candidate,
      targetModel: item.targetModel,
      scored: {
        ...item.scored,
        // Override finalScore with smart score for downstream use
        finalScore: Math.round(item.finalSmartScore),
      },
    })),
    selfModel,
    dimensions: [
      { id: "bidirectional", title: "双向偏好交叉", detail: "双向兴趣匹配度（调和平均）" },
      { id: "distance", title: "距离因子", detail: "地理距离评分" },
      { id: "popularity", title: "受欢迎度", detail: "人气分层与匹配策略" },
      { id: "activity", title: "活跃度", detail: "近期活跃度加权" },
    ],
    infoSources: [
      {
        id: "self_profile",
        title: "你的公开资料与匹配偏好",
        detail: "昵称、简介、年龄、性别、地区、关系类型、关键词等。",
        count: [
          self.name, self.bio, self.gender, self.age,
          self.preference?.region, self.preference?.matchTypes,
          self.preference?.keywords,
        ].filter((x) => x != null && String(x).trim().length > 0).length,
      },
      {
        id: "swipe_signals",
        title: "你的滑动偏好信号",
        detail: "从你喜欢/不喜欢的人中学习到的特质偏好。",
        count: weightedTagsFromJson(self.preferenceSignal?.likedTraitsJson).length +
          weightedTagsFromJson(self.preferenceSignal?.unlikedTraitsJson).length,
      },
      {
        id: "matching_profile",
        title: "你的匹配画像",
        detail: "AI 生成的匹配画像特质。",
        count: weightedTagsFromJson(self.matchingProfile?.traitsJson).length,
      },
      {
        id: "candidate_pool",
        title: "候选用户池",
        detail: "经过双向偏好过滤后的候选用户。",
        count: pool.length,
      },
    ],
  };
}
