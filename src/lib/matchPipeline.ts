import { prisma } from "@/lib/db";
import type { Prisma, User, UserPreference, UserPreferenceSignal } from "@prisma/client";
import { inferUserModel, scoreCompatibility, type UserModel } from "@/lib/userModeling";

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

type UserWithPref = User & { preference: UserPreference | null; preferenceSignal?: UserPreferenceSignal | null };

const MATCH_DIMENSIONS: MatchPipelineDimension[] = [
  {
    id: "profile_vector",
    title: "资料向量相似度",
    detail: "从简介、关键词、关系类型、共同活动和记忆文本生成 1024 维资料向量。",
  },
  {
    id: "attachment",
    title: "亲密关系安全感",
    detail: "推断安全型、焦虑型、回避型倾向，判断相处稳定性与互补风险。",
  },
  {
    id: "rhythm",
    title: "沟通节奏",
    detail: "比较低频、日常、高频互动偏好，节奏差异过大时直接降级。",
  },
  {
    id: "emotion",
    title: "情绪表达稳定度",
    detail: "从表达内容识别情绪稳定、敏感、冲突处理等信号。",
  },
  {
    id: "values",
    title: "价值观优先级",
    detail: "比较事业、家庭、自由、成长四类价值权重。",
  },
];

function parseArray(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim()).filter(Boolean);
  } catch {
    // ignore
  }
  return [];
}

function jsonTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (raw && typeof raw === "object" && "tags" in raw) {
    const tags = (raw as { tags?: unknown }).tags;
    if (Array.isArray(tags)) return tags.map(String);
  }
  return [];
}

function preferenceSignalBoost(signal: UserPreferenceSignal | null | undefined, candidate: UserWithPref): number {
  if (!signal) return 0;
  const liked = new Set(jsonTags(signal.likedTraitsJson).map((x) => x.toLowerCase()));
  const unliked = new Set(jsonTags(signal.unlikedTraitsJson).map((x) => x.toLowerCase()));
  const candidateTags = [
    ...parseArray(candidate.preference?.matchTypes),
    ...parseArray(candidate.preference?.activityTags),
    ...parseArray(candidate.preference?.keywords),
  ].map((x) => x.toLowerCase());
  return candidateTags.reduce((score, tag) => {
    if (liked.has(tag)) return score + 4;
    if (unliked.has(tag)) return score - 5;
    return score;
  }, 0);
}

function normRegion(r?: string | null): string {
  return (r ?? "").trim().toLowerCase();
}

/** 双方若都填写了地区，则必须一致 */
function mutualRegionOk(a: UserPreference | null | undefined, b: UserPreference | null | undefined): boolean {
  const ra = normRegion(a?.region);
  const rb = normRegion(b?.region);
  if (ra && rb && ra !== rb) return false;
  return true;
}

/** 双方期望的「对方年龄区间」是否有重叠（资料无年龄时的兜底） */
function ageRangesOverlap(a: UserPreference | null | undefined, b: UserPreference | null | undefined): boolean {
  const a1 = a?.ageMin;
  const a2 = a?.ageMax;
  const b1 = b?.ageMin;
  const b2 = b?.ageMax;
  if (a1 != null && a2 != null && b1 != null && b2 != null) {
    return Math.max(a1, b1) <= Math.min(a2, b2);
  }
  return true;
}

function normalizeGender(g?: string | null): string {
  const x = (g ?? "").trim().toLowerCase();
  if (x === "m" || x === "male" || x === "男") return "male";
  if (x === "f" || x === "female" || x === "女") return "female";
  if (x === "nonbinary" || x === "nb" || x === "非二元") return "nonbinary";
  return x;
}

function expectedGenderMatchesUser(expected?: string | null, userGender?: string | null): boolean {
  const e = (expected ?? "").trim().toLowerCase();
  if (!e || e === "any") return true;
  const ug = normalizeGender(userGender);
  if (!ug) return true;
  if (e === "male") return ug === "male";
  if (e === "female") return ug === "female";
  return true;
}

/** 双向：A 的性别符合 B 的期望，且 B 的性别符合 A 的期望（未填资料则跳过该侧校验） */
function mutualGenderOk(a: UserWithPref, b: UserWithPref): boolean {
  if (!expectedGenderMatchesUser(b.preference?.expectedGender, a.gender)) return false;
  if (!expectedGenderMatchesUser(a.preference?.expectedGender, b.gender)) return false;
  return true;
}

/** 双向：年龄落在对方心动设置区间内 */
function mutualAgeOk(a: UserWithPref, b: UserWithPref): boolean {
  const ap = a.preference;
  const bp = b.preference;
  if (a.age != null) {
    if (bp?.ageMin != null && a.age < bp.ageMin) return false;
    if (bp?.ageMax != null && a.age > bp.ageMax) return false;
  }
  if (b.age != null) {
    if (ap?.ageMin != null && b.age < ap.ageMin) return false;
    if (ap?.ageMax != null && b.age > ap.ageMax) return false;
  }
  if (!ageRangesOverlap(ap, bp)) return false;
  return true;
}

/** 若双方都填了匹配类型，则至少有一个交集 */
function matchTypesCompatible(a: UserPreference | null | undefined, b: UserPreference | null | undefined): boolean {
  const aa = parseArray(a?.matchTypes);
  const bb = parseArray(b?.matchTypes);
  if (aa.length === 0 || bb.length === 0) return true;
  const setB = new Set(bb.map((x) => x.toLowerCase()));
  return aa.some((x) => setB.has(x.toLowerCase()));
}

export function passesMutualHeartFilters(self: UserWithPref, candidate: UserWithPref): boolean {
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

/**
 * 从候选池扫描、统计各阶段人数，并产出向量兼容度排序结果（用于挑出本次最合适的人）。
 */
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
      // 游客一键试用号不参与「真实用户池」匹配
      NOT: { authProvider: "guest" },
    },
    include: { preference: true, preferenceSignal: true },
    orderBy: { updatedAt: "desc" },
    take: MAX_SCAN,
  });

  const active = pool.filter((u) => u.authProvider && u.authProvider.length > 0);
  const mutual = active.filter((c) => passesMutualHeartFilters(dbUser as UserWithPref, c as UserWithPref));

  const rankedRaw: Ranked[] = [];
  for (const candidate of mutual) {
    const factsRows = await prisma.ownerFact.findMany({
      where: { userId: candidate.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { content: true },
    });
    const msgRows = await prisma.matchMessage.findMany({
      where: { senderType: "user_self", match: { userId: candidate.id } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { content: true, createdAt: true },
    });
    const targetModel = inferUserModel({
      userId: candidate.id,
      bio: candidate.bio,
      keywords: candidate.preference?.keywords ?? null,
      matchTypes: candidate.preference?.matchTypes ?? null,
      chatPace: candidate.preference?.chatPace ?? null,
      meetPreference: candidate.preference?.meetPreference ?? null,
      emotionStyle: candidate.preference?.emotionStyle ?? null,
      activityTags: candidate.preference?.activityTags ?? null,
      ownerFacts: factsRows.map((x) => x.content),
      userMessages: msgRows.map((x) => x.content),
      userMessageCreatedAt: msgRows.map((x) => x.createdAt),
    });

    await upsertProfileEmbedding(candidate.id, targetModel).catch(() => {});

    const scored = scoreCompatibility(selfModel, targetModel);
    if (scored.hardRejectReasons.length > 0) continue;
    rankedRaw.push({ candidate: candidate as UserWithPref, targetModel, scored });
  }

  rankedRaw.sort(
    (a, b) =>
      b.scored.finalScore +
      preferenceSignalBoost((dbUser as UserWithPref).preferenceSignal, b.candidate) -
      (a.scored.finalScore + preferenceSignalBoost((dbUser as UserWithPref).preferenceSignal, a.candidate))
  );

  const stages: PipelineStageStat[] = [
    {
      id: "pool",
      title: "心动池扫描",
      detail: `从可匹配用户中取样（最多 ${MAX_SCAN} 人）`,
      count: pool.length,
    },
    {
      id: "active",
      title: "有效账号",
      detail: "已绑定登录方式、可参与匹配（已排除游客试用号）",
      count: active.length,
    },
    {
      id: "mutual_prefs",
      title: "双向心动条件",
      detail: "地区 / 年龄期望 / 性别期望 / 匹配类型等有交集",
      count: mutual.length,
    },
    {
      id: "vector_compat",
      title: "向量相似 + 合拍模型",
      detail: "基于资料向量与沟通/价值观模型，筛掉硬不合拍",
      count: rankedRaw.length,
    },
    {
      id: "ranked",
      title: "排序就绪",
      detail: "按内部综合信号排序，准备挑出本次最合适的人",
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
      title: "你的公开资料与心动设置",
      detail: "昵称、简介、年龄/性别、地区、关系类型、关键词、节奏、线上线下、情绪风格、共同活动。",
      count: selfProfileFieldCount,
    },
    {
      id: "self_facts",
      title: "你的长期信息库",
      detail: "最近写入的 OwnerFact，用来补足兴趣、边界、价值观和生活偏好。",
      count: selfFactsRows.length,
    },
    {
      id: "self_messages",
      title: "你的真人聊天样本",
      detail: "最近的 user_self 消息，用来估算表达长度、回复节奏、话题深度。",
      count: selfMsgRows.length,
    },
    {
      id: "candidate_profiles",
      title: "候选用户资料",
      detail: "候选人的公开资料、心动设置、长期信息库与历史表达信号。",
      count: pool.length,
    },
  ];

  return { stages, ranked: rankedRaw, selfModel, dimensions: MATCH_DIMENSIONS, infoSources };
}
