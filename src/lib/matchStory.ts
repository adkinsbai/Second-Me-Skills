import type { User, UserPreference } from "@prisma/client";
import { parseArray as parseProfileArray } from "@/lib/utils";

export type UserWithPreference = User & { preference: UserPreference | null };

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function buildProfileCorpus(user: UserWithPreference) {
  return [
    user.name,
    user.bio,
    user.gender,
    user.age,
    user.preference?.region,
    user.preference?.keywords,
    user.preference?.matchTypes,
    user.preference?.activityTags,
    user.preference?.chatPace,
    user.preference?.meetPreference,
    user.preference?.emotionStyle,
  ]
    .filter(Boolean)
    .join(" ");
}

export function sharedCities(a: string, b: string) {
  const cities = [
    "纽约",
    "New York",
    "上海",
    "北京",
    "深圳",
    "广州",
    "杭州",
    "成都",
    "南京",
    "伦敦",
    "London",
    "巴黎",
    "Paris",
    "东京",
    "Tokyo",
    "香港",
    "洛杉矶",
    "Los Angeles",
    "旧金山",
    "San Francisco",
    "新加坡",
    "Singapore",
  ];
  const normalize = (city: string) =>
    city
      .replace("New York", "纽约")
      .replace("London", "伦敦")
      .replace("Paris", "巴黎")
      .replace("Tokyo", "东京")
      .replace("Los Angeles", "洛杉矶")
      .replace("San Francisco", "旧金山")
      .replace("Singapore", "新加坡");
  return unique(cities.filter((city) => a.includes(city) && b.includes(city)).map(normalize));
}

export function sharedTags(self: UserWithPreference, candidate: UserWithPreference) {
  const selfTags = [
    ...parseProfileArray(self.preference?.matchTypes),
    ...parseProfileArray(self.preference?.activityTags),
    ...parseProfileArray(self.preference?.keywords),
  ];
  const candidateTags = [
    ...parseProfileArray(candidate.preference?.matchTypes),
    ...parseProfileArray(candidate.preference?.activityTags),
    ...parseProfileArray(candidate.preference?.keywords),
  ];
  const candidateSet = new Set(candidateTags.map((x) => x.toLowerCase()));
  return unique(selfTags.filter((x) => candidateSet.has(x.toLowerCase()))).slice(0, 3);
}

export function sharedProfessions(a: string, b: string) {
  const professions = [
    { label: "产品设计师", patterns: [/产品设计师|product designer|ux designer|ui designer|体验设计/i] },
    { label: "产品经理", patterns: [/产品经理|PM|product manager/i] },
    { label: "设计师", patterns: [/设计师|designer|设计/i] },
    { label: "创业者", patterns: [/创业|创始人|founder/i] },
    { label: "工程师", patterns: [/工程师|程序员|开发|engineer|developer/i] },
    { label: "艺术创作者", patterns: [/艺术|创作|摄影|音乐|写作|artist|creator/i] },
    { label: "学生", patterns: [/学生|研究生|大学|student/i] },
  ];
  return professions
    .filter((item) => item.patterns.some((re) => re.test(a)) && item.patterns.some((re) => re.test(b)))
    .map((item) => item.label)
    .slice(0, 2);
}

export function extractProfileTraits(user: UserWithPreference) {
  const corpus = buildProfileCorpus(user);
  return {
    cities: sharedCities(corpus, corpus),
    professions: sharedProfessions(corpus, corpus),
    tags: unique([
      ...parseProfileArray(user.preference?.matchTypes),
      ...parseProfileArray(user.preference?.activityTags),
      ...parseProfileArray(user.preference?.keywords),
    ]).slice(0, 12),
    region: user.preference?.region ?? "",
    age: user.age ?? null,
    gender: user.gender ?? "",
  };
}

export function buildMatchStory(self: UserWithPreference, candidate: UserWithPreference) {
  const selfCorpus = buildProfileCorpus(self);
  const candidateCorpus = buildProfileCorpus(candidate);
  const cities = sharedCities(selfCorpus, candidateCorpus);
  const professions = sharedProfessions(selfCorpus, candidateCorpus);
  const tags = sharedTags(self, candidate);
  const relationTypes = sharedTags(
    { ...self, preference: self.preference ? { ...self.preference, activityTags: null, keywords: null } : null },
    { ...candidate, preference: candidate.preference ? { ...candidate.preference, activityTags: null, keywords: null } : null }
  );

  if (cities.length >= 1 && professions.length > 0) {
    return `丘比看到你们都把 ${cities[0]} 写进了生活坐标，也都在用 ${professions[0]} 的方式理解世界。相似的城市经验和工作语境，会让开场更自然，也更容易聊到具体生活。`;
  }

  if (cities.length > 0 && tags.length > 0) {
    return `在 ${cities[0]} 这座城市里，你们都提到了「${tags[0]}」。这不是一个冷冰冰的标签，而是可以变成第一句开场、一次散步或一段共同体验的线索。`;
  }

  if (professions.length > 0 && tags.length > 0) {
    return `你们都带着 ${professions[0]} 的敏感度，也都被「${tags[0]}」吸引。丘比判断这段匹配更适合从具体作品、体验或最近的生活观察聊起。`;
  }

  if (tags.length >= 2) {
    return `丘比在你们身上看到了两簇相似的火花：「${tags[0]}」和「${tags[1]}」。它们足够小，也足够真实，适合作为第一轮对话的起点。`;
  }

  if (tags.length === 1) {
    return `你们都留下了「${tags[0]}」这个共同线索。丘比建议先从这个小话题开始，不急着定义关系，先确认彼此的表达和节奏是否舒服。`;
  }

  if (relationTypes.length > 0) {
    return `你们都在寻找「${relationTypes[0]}」。这说明你们对关系的入口有相似期待，适合先用轻松但真诚的对话确认是否同频。`;
  }

  return "丘比没有只看几个标签，而是把你们的资料、表达节奏、关系期待和生活气味放在一起比较。当前信号显示：这是一段值得从真诚开场开始验证的匹配。";
}
