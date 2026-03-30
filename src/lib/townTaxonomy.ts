export const TOWN_CATEGORY_TAXONOMY = [
  "比赛队友",
  "创业伙伴",
  "旅游搭子",
  "游戏搭子",
  "恋人",
  "灵魂朋友",
  "日常陪伴",
  "深夜聊废",
  "其他",
] as const;

export type TownCategory = (typeof TOWN_CATEGORY_TAXONOMY)[number];

function safeSlice(s: string, max = 80) {
  const t = s.trim();
  if (!t) return "";
  return t.length > max ? t.slice(0, max) + "…" : t;
}

export function normalizeTownCategory(input: string): TownCategory | null {
  const cleaned = input.trim();
  if (!cleaned) return null;
  if ((TOWN_CATEGORY_TAXONOMY as readonly string[]).includes(cleaned)) return cleaned as TownCategory;
  // 允许少量同义词兜底
  if (/队友|战队|比赛|电竞/.test(cleaned)) return "比赛队友";
  if (/创业|合伙|投资|项目/.test(cleaned)) return "创业伙伴";
  if (/旅游|旅行|出游|目的地/.test(cleaned)) return "旅游搭子";
  if (/游戏|开黑|主机|steam/.test(cleaned)) return "游戏搭子";
  if (/恋爱|对象|对象/.test(cleaned)) return "恋人";
  if (/灵魂|深度|精神/.test(cleaned)) return "灵魂朋友";
  if (/日常|生活|陪伴|周末/.test(cleaned)) return "日常陪伴";
  if (/深夜|夜聊|废|下班后/.test(cleaned)) return "深夜聊废";
  return "其他";
}

export function classifyTownCategoriesHeuristic(content: string): TownCategory[] {
  const c = content || "";
  const hits: TownCategory[] = [];
  const push = (cat: TownCategory) => {
    if (!hits.includes(cat)) hits.push(cat);
  };
  if (/(队友|战队|比赛|电竞|队伍)/.test(c)) push("比赛队友");
  if (/(创业|合伙|公司|项目|投资|融资|产品)/.test(c)) push("创业伙伴");
  if (/(旅游|旅行|出游|目的地)/.test(c)) push("旅游搭子");
  if (/(游戏|开黑|联机|主机|steam)/.test(c)) push("游戏搭子");
  if (/(恋爱|对象|对象|对象|对象|长期伴侣|结婚)/.test(c)) push("恋人");
  if (/(灵魂|深度|精神共鸣|三观|价值观|信任)/.test(c)) push("灵魂朋友");
  if (/(日常|生活|周末|陪伴|聊聊|轻互动)/.test(c)) push("日常陪伴");
  if (/(深夜|夜聊|废|emo|下班后)/.test(c)) push("深夜聊废");

  if (hits.length === 0) return ["其他"];
  return hits.slice(0, 3);
}

export function generateTownTitleHeuristic(content: string, categories: string[]): string {
  const c = safeSlice(content, 26);
  const cat = categories[0] ?? "其他";
  if (!c) return `找一位${cat}`;
  // 一句话：不超过约 30 个汉字更符合你原需求
  return `找一位${cat} · ${c}`.replace(/\s+/g, " ").slice(0, 30).trim();
}

export function extractJsonArray(text: string): unknown[] | null {
  const t = text || "";
  const match = t.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

