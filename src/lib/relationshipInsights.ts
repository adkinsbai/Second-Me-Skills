type ChatMsg = { senderType: string; content: string };

const STOPWORDS = new Set([
  "主人",
  "对方",
  "我们",
  "你们",
  "这个",
  "那个",
  "还是",
  "然后",
  "就是",
  "觉得",
  "喜欢",
  "可以",
  "一起",
  "聊天",
  "生活",
  "工作",
  "周末",
]);

function splitTokens(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && !STOPWORDS.has(s));
}

function overlapRatio(sourceA: string, sourceB: string): number {
  const a = new Set(splitTokens(sourceA));
  const b = new Set(splitTokens(sourceB));
  if (a.size === 0 || b.size === 0) return 0;
  let hit = 0;
  a.forEach((x) => {
    if (b.has(x)) hit += 1;
  });
  return hit / Math.max(1, Math.min(a.size, b.size));
}

function contradictionCount(messages: ChatMsg[]): number {
  const joined = messages.map((m) => m.content).join("\n");
  const pairs: Array<[RegExp, RegExp]> = [
    [/喜欢.*户外|经常.*出门/, /不太喜欢.*户外|更宅|懒得出门/],
    [/喜欢.*慢慢了解|慢热/, /节奏.*快|希望马上确定/],
    [/重视.*稳定|长期关系/, [/只想随便聊聊|不考虑长期/][0]],
  ];
  return pairs.reduce((n, [a, b]) => (a.test(joined) && b.test(joined) ? n + 1 : n), 0);
}

export function inferConsistencyPrediction(input: {
  messages: ChatMsg[];
  ownerFactsText: string;
  selfBio: string;
  shadesText: string;
  valuesScore?: number | null;
}): {
  score: number;
  level: "高" | "中" | "低";
  overlapRate: number;
  contradictions: number;
  hint: string;
} {
  const corpus = input.messages.map((m) => m.content).join("\n");
  const source = [input.ownerFactsText, input.selfBio, input.shadesText].filter(Boolean).join("\n");
  const overlap = overlapRatio(corpus, source);
  const contradictions = contradictionCount(input.messages);
  const valuesBonus = typeof input.valuesScore === "number" ? Math.max(-6, (input.valuesScore - 60) / 6) : 0;
  const score = Math.max(
    0,
    Math.min(100, Math.round(44 + overlap * 42 + valuesBonus - contradictions * 14))
  );
  const level: "高" | "中" | "低" = score >= 75 ? "高" : score >= 60 ? "中" : "低";
  const hint =
    score < 60
      ? "你们 AI 聊得不错，但部分观点可能来自 AI 发挥，真人见面建议多确认三观。"
      : score < 75
        ? "整体较可信，但仍建议在线下前核对边界、生活节奏与价值观细节。"
        : "AI 表达与主人画像重合度较高，真人落差风险相对较低。";
  return { score, level, overlapRate: Number((overlap * 100).toFixed(1)), contradictions, hint };
}

export function extractStarterTopics(messages: ChatMsg[], limit = 3): string[] {
  const lib = [
    { key: "电影", kws: ["电影", "看展", "剧", "纪录片"], text: "你们都对影视/展览有兴趣，可以先聊最近最想看的作品。" },
    { key: "户外", kws: ["户外", "散步", "运动", "旅行"], text: "你们都提到户外活动，可以从“理想周末路线”开场。" },
    { key: "游戏", kws: ["游戏", "开黑", "联机", "主机"], text: "你们都能聊游戏，先问一句“最近在玩什么”最自然。" },
    { key: "价值观", kws: ["三观", "边界", "安全感", "节奏"], text: "你们都在意关系边界与节奏，适合先聊“什么相处方式最舒服”。" },
    { key: "成长", kws: ["成长", "学习", "计划", "未来"], text: "你们都提到未来与成长，可从“最近想完成的小目标”切入。" },
  ];
  const corpus = messages.map((m) => m.content).join("\n");
  const picked = lib.filter((x) => x.kws.some((k) => corpus.includes(k))).map((x) => x.text);
  if (picked.length >= limit) return picked.slice(0, limit);
  const fallback = [
    "先分享今天一个小日常，再问对方最近最开心的一件事。",
    "用“你平时更喜欢___还是___？”做二选一问题，快速破冰。",
    "从 AI 对话里最有共鸣的一句话继续追问，避免尬聊重开。"
  ];
  return [...picked, ...fallback].slice(0, limit);
}

export function getActionPlan(totalScore: number): string[] {
  if (totalScore >= 80) {
    return ["发起一次语音聊天", "约一次线上共同活动（看剧/听歌/游戏）", "沟通是否交换联系方式"];
  }
  if (totalScore >= 60) {
    return ["深入聊一个价值观话题", "互相分享近一周日常", "补充彼此更真实的个人信息"];
  }
  return ["先作为普通朋友轻互动", "如无明显共鸣可礼貌跳过", "查看不匹配原因，用于优化下次筛选"];
}

export function getRelationshipProgress(totalScore: number, userChatCount: number) {
  const steps = ["初识", "兴趣相投", "三观契合", "可语音", "可线下"];
  let current = 0;
  if (totalScore >= 60) current = 1;
  if (totalScore >= 75) current = 2;
  if (userChatCount >= 3) current = 3;
  if (userChatCount >= 8 && totalScore >= 80) current = 4;
  return { steps, current };
}

export function getDateSuggestion(input: {
  interestScore: number;
  lifeStoryScore: number;
  meetPreference?: string | null;
}) {
  if (input.interestScore >= 75 && input.meetPreference !== "online") {
    return "你们兴趣重合度高，推荐咖啡馆/书店轻见面：停留 60-90 分钟即可。";
  }
  if (input.lifeStoryScore >= 75) {
    return "你们故事共鸣较强，建议先语音 20 分钟，再决定是否线下见面。";
  }
  return "建议先继续线上聊 2-3 天，等节奏稳定后再约轻量见面。";
}

