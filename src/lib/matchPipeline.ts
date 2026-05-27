import { prisma } from "@/lib/db";
import type { Prisma, User, UserPreference, UserPreferenceSignal } from "@prisma/client";
import { inferUserModel, scoreCompatibility, type UserModel } from "@/lib/userModeling";
import { preferenceSignalScore } from "@/lib/preferenceSignals";
import { parseArray } from "@/lib/utils";

const MAX_SCAN = 500;

export type PipelineStageStat = {
  id: string;
  title: string;
  detail: string;
  count: number;
};

export type MatchPipelineDimension = {
  id: string;
  title: string;
  detail: string;
};

export type MatchPipelineInfoSource = {
  id: string;
  title: string;
  detail: string;
  count: number;
};

type UserWithPref = User & {
  preference: UserPreference | null;
  preferenceSignal?: UserPreferenceSignal | null;
};

const MATCH_DIMENSIONS: MatchPipelineDimension[] = [
  {
    id: "profile_vector",
    title: "资料相似度",
    detail: "根据简介、关键词、关系类型、共同活动和长期记忆生成资料向量。",
  },
  {
    id: "attachment",
    title: "关系安全感",
    detail: "判断亲密关系里的安全感、推进节奏和互补风险。",
  },
  {
    id: "rhythm",
    title: "沟通节奏",
    detail: "比较低频、日常、高频互动偏好，避免节奏差异过大。",
  },
  {
    id: "emotion",
    title: "情绪表达",
    detail: "识别表达稳定度、敏感度、冲突处理方式和回应风格。",
  },
  {
    id: "values",
    title: "价值观优先级",
    detail: "比较事业、家庭、自由、成长等长期关系里的关键权重。",
  },
];

function normRegion(region?: string | null): string {
  return (region ?? "").trim().toLowerCase();
}

function mutualRegionOk(a: UserPreference | null | undefined, b: UserPreference | null | undefined): boolean {
  const aRegion = normRegion(a?.region);
  const bRegion = normRegion(b?.region);
  if (aRegion && bRegion && aRegion !== bRegion) return false;
  return true;
}

function ageRangesOverlap(a: UserPreference | null | undefined, b: UserPreference | null | undefined): boolean {
  const aMin = a?.ageMin;
  const aMax = a?.ageMax;
  const bMin = b?.ageMin;
  const bMax = b?.ageMax;
  if (aMin != null && aMax != null && bMin != null && bMax != null) {
    return Math.max(aMin, bMin) <= Math.min(aMax, bMax);
  }
  return true;
}

function normalizeGender(gender?: string | null): string {
  const value = (gender ?? "").trim().toLowerCase();
  if (["m", "male", "男", "男性"].includes(value)) return "male";
  if (["f", "female", "女", "女性"].includes(value)) return "female";
  if (["nonbinary", "non-binary", "nb", "非二元"].includes(value)) return "nonbinary";
  return value;
}

function expectedGenderMatchesUser(expected?: string | null, userGender?: string | null): boolean {
  const normalizedExpected = (expected ?? "").trim().toLowerCase();
  if (!normalizedExpected || normalizedExpected === "any") return true;
  const normalizedUserGender = normalizeGender(userGender);
  if (!normalizedUserGender) return true;
  if (normalizedExpected === "male") return normalizedUserGender === "male";
  if (normalizedExpected === "female") return normalizedUserGender === "female";
  return true;
}

function mutualGenderOk(a: UserWithPref, b: UserWithPref): boolean {
  if (!expectedGenderMatchesUser(b.preference?.expectedGender, a.gender)) return false;
  if (!expectedGenderMatchesUser(a.preference?.expectedGender, b.gender)) return false;
  return true;
}

function mutualAgeOk(a: UserWithPref, b: UserWithPref): boolean {
  const aPreference = a.preference;
  const bPreference = b.preference;
  if (a.age != null) {
    if (bPreference?.ageMin != null && a.age < bPreference.ageMin) return false;
    if (bPreference?.ageMax != null && a.age > bPreference.ageMax) return false;
  }
  if (b.age != null) {
    if (aPreference?.ageMin != null && b.age < aPreference.ageMin) return false;
    if (aPreference?.ageMax != null && b.age > aPreference.ageMax) return false;
  }
  return ageRangesOverlap(aPreference, bPreference);
}

function matchTypesCompatible(a: UserPreference | null | undefined, b: UserPreference | null | undefined): boolean {
  const aTypes = parseArray(a?.matchTypes);
  const bTypes = parseArray(b?.matchTypes);
  if (aTypes.length === 0 || bTypes.length === 0) return true;
  const bSet = new Set(bTypes.map((x) => x.toLowerCase()));
  return aTypes.some((x) => bSet.has(x.toLowerCase()));
}

export function passesMutualPreferenceFilters(self: UserWithPref, candidate: UserWithPref): boolean {
  if (!mutualRegionOk(self.preference, candidate.preference)) return false;
  if (!mutualGenderOk(self, candidate)) return false;
  if (!mutualAgeOk(self, candidate)) return false;
  if (!matchTypesCompatible(self.preference, candidate.preference)) return false;
  return true;
}

async function upsertProfileEmbedding(userId: string, model: UserModel) {
  await prisma.userEmbedding.upsert({
    where: { userId },
    create: {
      userId,
      source: "profile_hash",
      dims: model.embedding1024.length,
      values: model.embedding1024 as unknown as Prisma.InputJsonValue,
    },
    update: {
      values: model.embedding1024 as unknown as Prisma.InputJsonValue,
      dims: model.embedding1024.length,
    },
  });
}

type Ranked = {
  candidate: UserWithPref;
  targetModel: UserModel;
  scored: ReturnType<typeof scoreCompatibility>;
};

export type MatchPipelineResult = {
  stages: PipelineStageStat[];
  ranked: Ranked[];
  selfModel: UserModel;
  dimensions: MatchPipelineDimension[];
  infoSources: MatchPipelineInfoSource[];
};

export async function runMatchPipeline(selfId: string, excludeIds: string[]): Promise<MatchPipelineResult> {
  const dbUser = await prisma.user.findUnique({
    where: { id: selfId },
    include: { preference: true, preferenceSignal: true },
  });

  if (!dbUser) {
    return {
      stages: [],
      ranked: [],
      dimensions: MATCH_DIMENSIONS,
      infoSources: [],
      selfModel: inferUserModel({
        userId: selfId,
        bio: null,
        ownerFacts: [],
        userMessages: [],
        userMessageCreatedAt: [],
      }),
    };
  }

  const selfFactsRows = await prisma.ownerFact.findMany({
    where: { userId: selfId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { content: true },
  });
  const selfMsgRows = await prisma.matchMessage.findMany({
    where: { senderType: "user_self", match: { userId: selfId } },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { content: true, createdAt: true },
  });

  const selfModel = inferUserModel({
    userId: selfId,
    bio: dbUser.bio,
    keywords: dbUser.preference?.keywords ?? null,
    matchTypes: dbUser.preference?.matchTypes ?? null,
    chatPace: dbUser.preference?.chatPace ?? null,
    meetPreference: dbUser.preference?.meetPreference ?? null,
    emotionStyle: dbUser.preference?.emotionStyle ?? null,
    activityTags: dbUser.preference?.activityTags ?? null,
    ownerFacts: selfFactsRows.map((x) => x.content),
    userMessages: selfMsgRows.map((x) => x.content),
    userMessageCreatedAt: selfMsgRows.map((x) => x.createdAt),
  });

  await upsertProfileEmbedding(selfId, selfModel).catch(() => {});

  const pool = await prisma.user.findMany({
    where: {
      id: { notIn: excludeIds },
      NOT: { authProvider: "guest" },
    },
    include: { preference: true, preferenceSignal: true },
    orderBy: { updatedAt: "desc" },
    take: MAX_SCAN,
  });

  const active = pool.filter((u) => u.authProvider && u.authProvider.length > 0);
  const mutual = active.filter((candidate) =>
    passesMutualPreferenceFilters(dbUser as UserWithPref, candidate as UserWithPref)
  );

  // --- Batch-fetch ownerFacts for all candidates (fixes N+1) ---
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

  // Group facts by userId (keep only the first 20 per user due to orderBy desc)
  const factsByUser = new Map<string, string[]>();
  for (const row of allFactsRows) {
    const list = factsByUser.get(row.userId);
    if (!list) {
      factsByUser.set(row.userId, [row.content]);
    } else if (list.length < 20) {
      list.push(row.content);
    }
  }

  // Group messages by match.userId (keep only the first 30 per user)
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

  const rankedRaw: Ranked[] = [];
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

    await upsertProfileEmbedding(candidate.id, targetModel).catch(() => {});

    const scored = scoreCompatibility(selfModel, targetModel);
    if (scored.hardRejectReasons.length > 0) continue;
    rankedRaw.push({ candidate: candidate as UserWithPref, targetModel, scored });
  }

  // Pre-compute signal scores to avoid redundant work in the sort comparator
  const signalScoreMap = new Map<string, number>();
  const selfSignal = (dbUser as UserWithPref).preferenceSignal;
  for (const r of rankedRaw) {
    signalScoreMap.set(r.candidate.id, preferenceSignalScore(selfSignal, r.candidate));
  }

  rankedRaw.sort(
    (a, b) =>
      b.scored.finalScore +
      (signalScoreMap.get(b.candidate.id) ?? 0) -
      (a.scored.finalScore + (signalScoreMap.get(a.candidate.id) ?? 0))
  );

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
      detail: "排除游客试用号，只保留可参与匹配的真实账号。",
      count: active.length,
    },
    {
      id: "mutual_prefs",
      title: "双向偏好过滤",
      detail: "检查地区、年龄、性别期待和关系类型是否存在明显冲突。",
      count: mutual.length,
    },
    {
      id: "vector_compat",
      title: "合拍模型评分",
      detail: "结合资料向量、沟通节奏、情绪表达和价值观模型继续筛选。",
      count: rankedRaw.length,
    },
    {
      id: "ranked",
      title: "推荐排序",
      detail: "按综合信号排序，挑出本轮最值得认识的人。",
      count: rankedRaw.length,
    },
  ];

  const selfProfileFieldCount = [
    dbUser.name,
    dbUser.bio,
    dbUser.gender,
    dbUser.age,
    dbUser.preference?.region,
    dbUser.preference?.matchTypes,
    dbUser.preference?.keywords,
    dbUser.preference?.chatPace,
    dbUser.preference?.meetPreference,
    dbUser.preference?.emotionStyle,
    dbUser.preference?.activityTags,
  ].filter((x) => x != null && String(x).trim().length > 0).length;

  const infoSources: MatchPipelineInfoSource[] = [
    {
      id: "self_profile",
      title: "你的公开资料与匹配偏好",
      detail: "昵称、简介、年龄、性别、地区、关系类型、关键词、沟通节奏和共同活动。",
      count: selfProfileFieldCount,
    },
    {
      id: "self_facts",
      title: "你的长期信息库",
      detail: "最近写入的 OwnerFact，用于补足兴趣、边界、价值观和生活偏好。",
      count: selfFactsRows.length,
    },
    {
      id: "self_messages",
      title: "你的聊天样本",
      detail: "最近的真人聊天样本，用来估算表达长度、回复节奏和话题深度。",
      count: selfMsgRows.length,
    },
    {
      id: "candidate_profiles",
      title: "候选用户资料",
      detail: "候选人的公开资料、匹配偏好、长期信息库和历史表达信号。",
      count: pool.length,
    },
  ];

  return { stages, ranked: rankedRaw, selfModel, dimensions: MATCH_DIMENSIONS, infoSources };
}
