import type { User, UserPreference } from "@prisma/client";

export type UserWithPreference = User & { preference: UserPreference | null };

export function parseProfileArray(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim()).filter(Boolean);
  } catch {
    // ignore non-JSON legacy strings
  }
  return raw
    .split(/[,，、/|\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function buildProfileCorpus(user: UserWithPreference) {
  return [
    user.name,
    user.bio,
    user.preference?.region,
    user.preference?.keywords,
    user.preference?.matchTypes,
    user.preference?.activityTags,
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
    { label: "产品人", patterns: [/产品经理|产品人|PM|product manager/i] },
    { label: "设计师", patterns: [/设计师|designer|设计/i] },
    { label: "创业者", patterns: [/创业|创始人|founder/i] },
    { label: "工程师", patterns: [/工程师|程序员|开发|engineer|developer/i] },
    { label: "艺术创作者", patterns: [/艺术|创作|摄影|音乐|写作|artist|creator/i] },
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

  if (cities.length >= 2 && professions.length > 0) {
    return `或许有一刻，你与 TA 曾在${cities[0]}的街道擦肩而过，把同一种野心和孤独藏进人群；而此刻，${cities[1]}又把你们重新推到彼此面前。两个同样在意体验、秩序与美感的${professions[0]}，一个创造产品里的心动，一个也在现实里等待被看见。也许这不是一次普通推荐，而是一段故事终于找到了开头。`;
  }

  if (cities.length > 0 && professions.length > 0) {
    return `丘比看见，你们都把${cities[0]}写进了生活的坐标，也都在用${professions[0]}的方式理解世界：把混乱理顺，把需求照亮，把普通日子雕刻成可被记住的体验。也许你们真正相似的地方，不只是标签，而是都相信人和人之间可以被认真设计、温柔靠近。`;
  }

  if (cities.length > 0 && tags.length > 0) {
    return `在${cities[0]}这座巨大的城市里，两个陌生人都把「${tags[0]}」留在了自己的期待里。人海每天都在擦肩，但不是每一次擦肩都有回声；这一次，丘比听见了你们之间那点微弱却明亮的共振。也许你们可以从一个很小的问题开始，把这座城市聊成只属于你们的地图。`;
  }

  if (professions.length > 0 && tags.length > 0) {
    return `你们像是两条各自燃烧的轨道：同样带着${professions[0]}的敏感与创造力，也同样被「${tags[0]}」吸引。你们或许都太习惯把好的体验留给别人，却忘了自己也值得被认真体验、被热烈回应。丘比想把你们放到同一页故事里，看看两个会创造美的人，能不能也创造一段美妙关系。`;
  }

  if (tags.length >= 2) {
    return `丘比在你们身上看见了两簇相似的火：一簇叫「${tags[0]}」，一簇叫「${tags[1]}」。它们不喧哗，却足够把两个原本陌生的人照亮。也许你们不必急着定义关系，只需要从一次真诚的开场开始，让那些相似的渴望慢慢认出彼此。`;
  }

  if (relationTypes.length > 0) {
    return `你们都在寻找「${relationTypes[0]}」，这四个字背后不是随便认识一个人，而是想被理解、被接住、被某个同频的灵魂轻轻点亮。丘比把 TA 带到你面前，是因为你们的期待像两封还没寄出的信，终于有机会投向同一个地址。`;
  }

  return "丘比没有只看几个冰冷标签，而是把你们的表达、节奏、期待和生活气味放在一起听。它听见两颗心都在小心翼翼地寻找一个可以真实开始的人：不必表演，不必迎合，只要一句真诚的开场，或许就能让故事往前走一步。";
}
