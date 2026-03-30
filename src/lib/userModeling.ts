export type RelationshipGoal = "romance" | "soulmate" | "companion" | "marriage" | "unknown";
export type AttachmentType = "secure" | "anxious" | "avoidant";
export type Pace = "low" | "medium" | "high";

export type UserModel = {
  userId: string;
  relationshipGoal: RelationshipGoal;
  attachmentType: AttachmentType;
  emotionalStability: number; // 0..100
  conflictStyle: "direct" | "avoidant" | "balanced";
  communicationPace: Pace;
  communicationInitiative: number; // 0..100
  intimacyNeed: number; // 0..100
  valuePriority: {
    career: number;
    family: number;
    freedom: number;
    growth: number;
  };
  consumeStyle: "rational" | "balanced" | "impulse";
  timeStyle: "planful" | "flexible";
  expectedFrequency: "low" | "medium" | "high";
  expectedAdvancePace: "slow" | "normal" | "fast";
  redFlags: string[];
  topicPref: {
    life: number;
    emotion: number;
    work: number;
    entertainment: number;
  };
  talkStyle: "rational" | "emotional" | "humor" | "sharp" | "balanced";
  avgReplyMinutes: number;
  avgMsgLength: number;
  dialogDepth: number; // 0..100
  qualityScore: number; // 0..100
  qualityFlags: string[];
  embedding1024: number[];
};

type InferInput = {
  userId: string;
  bio?: string | null;
  keywords?: string | null;
  matchTypes?: string | null;
  chatPace?: string | null;
  meetPreference?: string | null;
  emotionStyle?: string | null;
  activityTags?: string | null;
  ownerFacts: string[];
  userMessages: string[];
  userMessageCreatedAt: Date[];
};

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

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

function paceToNum(p: Pace) {
  return p === "low" ? 0 : p === "medium" ? 1 : 2;
}

function detectGoal(matchTypes: string[]): RelationshipGoal {
  const t = matchTypes.join("|");
  if (/结婚|婚姻|长期伴侣/.test(t)) return "marriage";
  if (/恋人|恋爱|对象/.test(t)) return "romance";
  if (/灵魂|深度|精神/.test(t)) return "soulmate";
  if (/陪伴|搭子|朋友|玩伴/.test(t)) return "companion";
  return "unknown";
}

function inferAttachment(text: string): AttachmentType {
  if (/安全感|边界|稳定|信任/.test(text)) return "secure";
  if (/害怕|焦虑|患得患失|不安/.test(text)) return "anxious";
  if (/独处|慢热|保持距离|回避/.test(text)) return "avoidant";
  return "secure";
}

function inferTalkStyle(text: string): UserModel["talkStyle"] {
  if (/哈哈|hh|有趣|玩笑/.test(text)) return "humor";
  if (/逻辑|理性|分析|结构/.test(text)) return "rational";
  if (/感受|情绪|共鸣|在乎/.test(text)) return "emotional";
  if (/烦|滚|无语|尖锐/.test(text)) return "sharp";
  return "balanced";
}

function inferValuePriority(text: string) {
  const score = (kw: RegExp) => (kw.test(text) ? 80 : 55);
  return {
    career: score(/事业|工作|成长|目标|效率/),
    family: score(/家庭|亲密|陪伴|关系|稳定/),
    freedom: score(/自由|空间|独处|松弛/),
    growth: score(/学习|提升|迭代|进步/),
  };
}

function inferTopicPref(text: string) {
  const hit = (kw: RegExp) => (kw.test(text) ? 78 : 52);
  return {
    life: hit(/周末|日常|生活|吃饭|散步|城市/),
    emotion: hit(/情绪|关系|安全感|边界|共鸣/),
    work: hit(/工作|职业|项目|创业|成长/),
    entertainment: hit(/电影|游戏|音乐|看展|旅行/),
  };
}

function buildEmbedding1024(text: string): number[] {
  const dims = 1024;
  const vec = Array.from({ length: dims }, () => 0);
  const tokens = text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((x) => x.length > 1);
  for (const token of tokens) {
    let h = 0;
    for (let i = 0; i < token.length; i++) h = (h * 131 + token.charCodeAt(i)) >>> 0;
    vec[h % dims] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
  return vec.map((x) => x / norm);
}

function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot;
}

export function inferUserModel(input: InferInput): UserModel {
  const matchTypes = parseArray(input.matchTypes);
  const activity = parseArray(input.activityTags);
  const allText = [
    input.bio ?? "",
    input.keywords ?? "",
    matchTypes.join(" "),
    activity.join(" "),
    ...input.ownerFacts,
    ...input.userMessages,
  ].join("\n");

  const communicationPace: Pace =
    input.chatPace === "low" || input.chatPace === "medium" || input.chatPace === "high"
      ? (input.chatPace as Pace)
      : "medium";
  const expectedFrequency = communicationPace;
  const expectedAdvancePace =
    input.meetPreference === "offline"
      ? "fast"
      : input.meetPreference === "online"
        ? "slow"
        : "normal";

  let avgReplyMinutes = 180;
  if (input.userMessageCreatedAt.length >= 2) {
    const sorted = [...input.userMessageCreatedAt].sort((a, b) => a.getTime() - b.getTime());
    let total = 0;
    for (let i = 1; i < sorted.length; i++) total += Math.max(1, (sorted[i].getTime() - sorted[i - 1].getTime()) / 60000);
    avgReplyMinutes = total / (sorted.length - 1);
  }
  const avgMsgLength =
    input.userMessages.length > 0
      ? input.userMessages.reduce((s, x) => s + x.length, 0) / input.userMessages.length
      : 16;

  const negativeHits = (allText.match(/不想|算了|烦|没兴趣|滚|无语|讨厌/g) ?? []).length;
  const offensiveHits = (allText.match(/滚|傻|蠢|恶心|骚扰/g) ?? []).length;
  const depthHits = (allText.match(/为什么|如何|价值观|边界|长期|未来|信任/g) ?? []).length;

  const qualityFlags: string[] = [];
  if (offensiveHits >= 2) qualityFlags.push("表达冒犯");
  if (negativeHits >= 5) qualityFlags.push("态度消极");
  if (avgMsgLength < 8 && input.userMessages.length >= 8) qualityFlags.push("表达过短");
  const qualityScore = clamp(76 - offensiveHits * 20 - negativeHits * 4 - (avgMsgLength < 8 ? 8 : 0));

  return {
    userId: input.userId,
    relationshipGoal: detectGoal(matchTypes),
    attachmentType: inferAttachment(allText),
    emotionalStability: clamp(68 - negativeHits * 4 + depthHits * 1.5),
    conflictStyle:
      input.emotionStyle === "direct" ? "direct" : input.emotionStyle === "slow" ? "avoidant" : "balanced",
    communicationPace,
    communicationInitiative: clamp(55 + (communicationPace === "high" ? 18 : communicationPace === "low" ? -12 : 0)),
    intimacyNeed: clamp(60 + (detectGoal(matchTypes) === "marriage" ? 18 : detectGoal(matchTypes) === "companion" ? -10 : 5)),
    valuePriority: inferValuePriority(allText),
    consumeStyle: /理性|预算|计划/.test(allText) ? "rational" : /冲动|随便买/.test(allText) ? "impulse" : "balanced",
    timeStyle: /计划|安排|准时|规律/.test(allText) ? "planful" : "flexible",
    expectedFrequency,
    expectedAdvancePace,
    redFlags: parseArray(input.keywords).filter((x) => /雷点|不能|不接受|底线/.test(x)),
    topicPref: inferTopicPref(allText),
    talkStyle: inferTalkStyle(allText),
    avgReplyMinutes,
    avgMsgLength,
    dialogDepth: clamp(40 + depthHits * 8 + Math.min(20, avgMsgLength / 2)),
    qualityScore,
    qualityFlags,
    embedding1024: buildEmbedding1024(allText),
  };
}

export function scoreCompatibility(a: UserModel, b: UserModel) {
  const hardRejectReasons: string[] = [];
  if (a.relationshipGoal !== "unknown" && b.relationshipGoal !== "unknown" && a.relationshipGoal !== b.relationshipGoal) {
    hardRejectReasons.push("关系目标不一致");
  }
  if (Math.abs(paceToNum(a.communicationPace) - paceToNum(b.communicationPace)) >= 2) {
    hardRejectReasons.push("沟通节奏差异过大");
  }
  if (a.qualityScore < 45 || b.qualityScore < 45) {
    hardRejectReasons.push("用户质量评分过低");
  }
  if (a.qualityFlags.includes("表达冒犯") || b.qualityFlags.includes("表达冒犯")) {
    hardRejectReasons.push("存在冒犯表达风险");
  }

  const sim = (cosine(a.embedding1024, b.embedding1024) + 1) / 2;
  const attachScore =
    a.attachmentType === b.attachmentType
      ? 88
      : (a.attachmentType === "secure" && b.attachmentType === "anxious") ||
          (a.attachmentType === "anxious" && b.attachmentType === "secure")
        ? 72
        : 58;
  const rhythmScore = clamp(
    92 - Math.abs(paceToNum(a.communicationPace) - paceToNum(b.communicationPace)) * 22
  );
  const emotionScore = clamp(100 - Math.abs(a.emotionalStability - b.emotionalStability) * 0.9);
  const valueScore = clamp(
    100 -
      (Math.abs(a.valuePriority.career - b.valuePriority.career) +
        Math.abs(a.valuePriority.family - b.valuePriority.family) +
        Math.abs(a.valuePriority.freedom - b.valuePriority.freedom) +
        Math.abs(a.valuePriority.growth - b.valuePriority.growth)) /
        8
  );

  let finalScore = clamp(sim * 55 + attachScore * 0.15 + rhythmScore * 0.13 + emotionScore * 0.09 + valueScore * 0.08);
  if (hardRejectReasons.includes("沟通节奏差异过大")) finalScore = clamp(finalScore - 15);
  if (valueScore < 55) hardRejectReasons.push("价值观冲突显著");
  if (hardRejectReasons.includes("价值观冲突显著")) finalScore = clamp(finalScore - 25);

  return {
    finalScore: Math.round(finalScore),
    hardRejectReasons,
    explain: {
      rhythm: Math.round(rhythmScore),
      emotion: Math.round(emotionScore),
      values: Math.round(valueScore),
      attachment: Math.round(attachScore),
      vectorSimilarity: Number(sim.toFixed(3)),
    },
  };
}

