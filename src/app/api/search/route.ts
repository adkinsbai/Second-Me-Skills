import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/* ──────────────────────────────────────────────────────────────
 *  AI Natural Language Search API
 *  POST /api/search
 *  Body: { query: string }
 *  Returns matched user profiles with AI reasoning
 * ────────────────────────────────────────────────────────────── */

type CandidateRow = {
  id: string;
  name: string | null;
  age: number | null;
  gender: string | null;
  bio: string | null;
  avatarUrl: string | null;
  photo1: string | null;
  photo2: string | null;
  photo3: string | null;
  latitude: number | null;
  longitude: number | null;
  keywords: string | null;
  matchTypes: string | null;
  activityTags: string | null;
  chatPace: string | null;
  meetPreference: string | null;
  emotionStyle: string | null;
  region: string | null;
  profileAnswers: unknown;
};

// Simple Chinese keyword extraction
const GENDER_MAP: Record<string, string> = {
  "男": "male", "男生": "male", "男孩": "male", "帅哥": "male", "小哥哥": "male", "男性": "male",
  "女": "female", "女生": "female", "女孩": "female", "美女": "female", "小姐姐": "female", "女性": "female",
};

const REGION_KEYWORDS = [
  "北京", "上海", "广州", "深圳", "杭州", "成都", "重庆", "武汉", "南京", "西安",
  "苏州", "天津", "长沙", "郑州", "青岛", "厦门", "昆明", "合肥", "福州", "济南",
  "东北", "四川", "广东", "浙江", "江苏", "山东", "河南", "湖北", "湖南", "福建",
];

const INTEREST_KEYWORDS = [
  "读书", "阅读", "电影", "音乐", "旅行", "旅游", "健身", "运动", "跑步", "游泳",
  "摄影", "画画", "绘画", "游戏", "打游戏", "做饭", "烹饪", "烘焙", "咖啡", "茶",
  "猫", "狗", "宠物", "户外", "登山", "徒步", "露营", "滑雪", "冲浪", "瑜伽",
  "编程", "科技", "动漫", "二次元", "追剧", "综艺", "展览", "博物馆", "话剧", "音乐会",
  "创业", "投资", "理财", "美食", "火锅", "烧烤", "日料", "韩料", "西餐",
  "篮球", "足球", "网球", "羽毛球", "乒乓球", "电竞", "LOL", "王者", "原神",
  "写作", "日记", "冥想", "心理学", "哲学", "天文", "植物", "花艺",
];

const PERSONALITY_KEYWORDS = [
  "温柔", "可爱", "有趣", "幽默", "成熟", "稳重", "活泼", "开朗", "安静", "内向",
  "外向", "细心", "体贴", "浪漫", "专一", "独立", "自信", "善良", "真诚", "上进",
  "文艺", "阳光", "酷", "潮", "理性", "感性", "佛系", "热血", "佛系", "慢热",
];

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractCriteria(query: string) {
  const q = query.toLowerCase();
  const criteria: {
    gender?: string;
    ageMin?: number;
    ageMax?: number;
    region?: string;
    interests: string[];
    personalities: string[];
    keywords: string[];
  } = {
    interests: [],
    personalities: [],
    keywords: [],
  };

  // Gender
  for (const [cn, en] of Object.entries(GENDER_MAP)) {
    if (query.includes(cn)) { criteria.gender = en; break; }
  }

  // Age range
  const ageRangeMatch = query.match(/(\d{2})\s*[-到至~]\s*(\d{2})\s*岁/);
  if (ageRangeMatch) {
    criteria.ageMin = parseInt(ageRangeMatch[1]);
    criteria.ageMax = parseInt(ageRangeMatch[2]);
  }
  const ageAbove = query.match(/(\d{2})\s*岁以[上大]/);
  if (ageAbove) criteria.ageMin = parseInt(ageAbove[1]);
  const ageBelow = query.match(/(\d{2})\s*岁以[下小]/);
  if (ageBelow) criteria.ageMax = parseInt(ageBelow[1]);

  // Region
  for (const r of REGION_KEYWORDS) {
    if (query.includes(r)) { criteria.region = r; break; }
  }

  // Interests
  for (const tag of INTEREST_KEYWORDS) {
    if (q.includes(tag)) criteria.interests.push(tag);
  }

  // Personality
  for (const tag of PERSONALITY_KEYWORDS) {
    if (q.includes(tag)) criteria.personalities.push(tag);
  }

  // Fallback: extract remaining meaningful words (>1 char, not common)
  const commonWords = new Set([
    "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一",
    "一个", "上", "也", "很", "到", "说", "要", "去", "你", "会", "着", "没有",
    "看", "好", "自己", "这", "他", "她", "吗", "想要", "想找", "希望", "喜欢",
    "想找一个", "喜欢的", "想要的", "什么样", "什么", "样的", "那种", "那种的",
    "岁", "左右", "比较", "非常", "特别", "超级", "最", "能", "可以", "一起",
    "最好", "然后", "或者", "但是", "因为", "所以", "如果", "虽然", "而且",
    "恋爱", "对象", "另一半", "伴侣", "朋友", "搭子", "伙伴",
  ]);
  // Don't add duplicates
  const existingSet = new Set([...criteria.interests, ...criteria.personalities, criteria.region ?? ""]);
  const words = query.replace(/[，。！？、；：""''（）\[\]{},.?;:!'"()\s]+/g, " ").split(" ");
  for (const w of words) {
    if (w.length >= 2 && !commonWords.has(w) && !existingSet.has(w) && criteria.keywords.length < 10) {
      criteria.keywords.push(w);
    }
  }

  return criteria;
}

function scoreCandidate(
  c: CandidateRow,
  criteria: ReturnType<typeof extractCriteria>,
  viewerLat: number | null,
  viewerLng: number | null,
): { score: number; reasons: string[] } {
  let score = 50; // base
  const reasons: string[] = [];

  // Gender filter
  if (criteria.gender && c.gender && c.gender !== criteria.gender) {
    return { score: -1, reasons: ["性别不匹配"] };
  }

  // Age
  if (criteria.ageMin && c.age && c.age < criteria.ageMin) {
    return { score: -1, reasons: ["年龄不符"] };
  }
  if (criteria.ageMax && c.age && c.age > criteria.ageMax) {
    return { score: -1, reasons: ["年龄不符"] };
  }

  // Region
  if (criteria.region && c.region) {
    if (c.region.includes(criteria.region) || criteria.region.includes(c.region)) {
      score += 20;
      reasons.push(`同在${criteria.region}地区`);
    }
  }

  // Distance bonus
  if (viewerLat != null && viewerLng != null && c.latitude != null && c.longitude != null) {
    const km = haversineKm(viewerLat, viewerLng, c.latitude, c.longitude);
    if (km < 10) { score += 15; reasons.push("距离很近"); }
    else if (km < 50) { score += 8; reasons.push("距离较近"); }
  }

  // Profile text for matching
  const profileText = [
    c.bio ?? "",
    c.keywords ?? "",
    c.matchTypes ?? "",
    c.activityTags ?? "",
    c.chatPace ?? "",
    c.meetPreference ?? "",
    c.emotionStyle ?? "",
    JSON.stringify(c.profileAnswers ?? {}),
  ].join(" ").toLowerCase();

  // Interest match
  let interestHits = 0;
  for (const tag of criteria.interests) {
    if (profileText.includes(tag)) {
      interestHits++;
      reasons.push(`兴趣相投：${tag}`);
    }
  }
  score += interestHits * 12;

  // Personality match
  let personalityHits = 0;
  for (const tag of criteria.personalities) {
    if (profileText.includes(tag)) {
      personalityHits++;
      reasons.push(`性格契合：${tag}`);
    }
  }
  score += personalityHits * 10;

  // General keyword match
  let keywordHits = 0;
  for (const kw of criteria.keywords) {
    if (profileText.includes(kw)) {
      keywordHits++;
    }
  }
  score += keywordHits * 6;
  if (keywordHits > 0) reasons.push(`匹配${keywordHits}个关键词`);

  // Bio completeness bonus
  if (c.bio && c.bio.length > 20) score += 5;
  if (c.photo1) score += 3;

  return { score: Math.min(100, Math.max(0, score)), reasons };
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ code: -1, msg: "请先登录" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const query = (body.query ?? "").trim();
    if (!query || query.length < 2) {
      return NextResponse.json({ code: -1, msg: "请输入搜索内容" }, { status: 400 });
    }
    if (query.length > 500) {
      return NextResponse.json({ code: -1, msg: "搜索内容过长" }, { status: 400 });
    }

    const criteria = extractCriteria(query);

    // Build Prisma where clause
    const where: Record<string, unknown>[] = [
      { id: { not: user.id } },      // exclude self
      { deletedAt: null },            // not deleted
      { onboardingDone: true },       // completed onboarding
    ];

    if (criteria.gender) {
      where.push({ gender: criteria.gender });
    }
    if (criteria.ageMin) {
      where.push({ age: { gte: criteria.ageMin } });
    }
    if (criteria.ageMax) {
      where.push({ age: { lte: criteria.ageMax } });
    }

    // Fetch candidates (limited scan)
    const candidates = await prisma.user.findMany({
      where: { AND: where },
      select: {
        id: true,
        name: true,
        age: true,
        gender: true,
        bio: true,
        avatarUrl: true,
        photo1: true,
        photo2: true,
        photo3: true,
        latitude: true,
        longitude: true,
        preference: {
          select: {
            keywords: true,
            matchTypes: true,
            activityTags: true,
            chatPace: true,
            meetPreference: true,
            emotionStyle: true,
            region: true,
          },
        },
        profileAnswers: true,
        profileCompleteness: true,
      },
      orderBy: { profileCompleteness: "desc" },
      take: 500,
    });

    // Get viewer location
    const viewer = await prisma.user.findUnique({
      where: { id: user.id },
      select: { latitude: true, longitude: true },
    });

    // Score and sort
    const scored = candidates
      .map((c) => {
        const row: CandidateRow = {
          id: c.id,
          name: c.name,
          age: c.age,
          gender: c.gender,
          bio: c.bio,
          avatarUrl: c.avatarUrl,
          photo1: c.photo1,
          photo2: c.photo2,
          photo3: c.photo3,
          latitude: c.latitude,
          longitude: c.longitude,
          keywords: c.preference?.keywords ?? null,
          matchTypes: c.preference?.matchTypes ?? null,
          activityTags: c.preference?.activityTags ?? null,
          chatPace: c.preference?.chatPace ?? null,
          meetPreference: c.preference?.meetPreference ?? null,
          emotionStyle: c.preference?.emotionStyle ?? null,
          region: c.preference?.region ?? null,
          profileAnswers: c.profileAnswers,
        };
        const result = scoreCandidate(row, criteria, viewer?.latitude ?? null, viewer?.longitude ?? null);
        return {
          id: c.id,
          name: c.name,
          age: c.age,
          gender: c.gender,
          bio: c.bio,
          avatarUrl: c.avatarUrl,
          photos: [c.photo1, c.photo2, c.photo3].filter(Boolean) as string[],
          score: result.score,
          reasons: result.reasons,
          region: c.preference?.region ?? null,
        };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Generate AI-style summary
    const criteriaDesc: string[] = [];
    if (criteria.gender) criteriaDesc.push(criteria.gender === "male" ? "男生" : "女生");
    if (criteria.ageMin || criteria.ageMax) {
      const min = criteria.ageMin ?? "?";
      const max = criteria.ageMax ?? "?";
      criteriaDesc.push(`${min}-${max}岁`);
    }
    if (criteria.region) criteriaDesc.push(criteria.region);
    if (criteria.interests.length > 0) criteriaDesc.push(`喜欢${criteria.interests.join("、")}`);
    if (criteria.personalities.length > 0) criteriaDesc.push(`性格${criteria.personalities.join("、")}`);

    const summary = scored.length > 0
      ? `为你找到了 ${scored.length} 位符合「${criteriaDesc.join("，") || query}」的用户 💕`
      : `抱歉，暂时没有找到完全符合「${criteriaDesc.join("，") || query}」的用户，试试换个描述？`;

    return NextResponse.json({
      code: 0,
      data: {
        query,
        criteria: criteriaDesc,
        summary,
        matches: scored,
        total: scored.length,
      },
    });
  } catch (err) {
    console.error("[search] error", err);
    return NextResponse.json({ code: -1, msg: "搜索出错，请稍后重试" }, { status: 500 });
  }
}
