import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/* ──────────────────────────────────────────────────────────────
 *  AI Natural Language Search API  (DeepSeek powered)
 *  POST /api/search
 *  Body: { query: string }
 *  Returns matched user profiles with AI reasoning
 * ────────────────────────────────────────────────────────────── */

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

type SearchCriteria = {
  gender?: "male" | "female";
  ageMin?: number;
  ageMax?: number;
  cities?: string[];
  interests?: string[];
  personality?: string[];
  education?: string;
  occupation?: string[];
  hasHouse?: boolean;
  hasCar?: boolean;
  travelExperience?: string[];
  keywords?: string[];
};

// ── DeepSeek: parse natural language into structured criteria ──

async function parseQueryWithAI(query: string): Promise<{ criteria: SearchCriteria; explanation: string }> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY not configured");
  }

  const systemPrompt = `你是一个交友App的AI搜索助手。用户会用自然语言描述想找的理想对象，你需要解析成结构化JSON。

返回JSON对象，包含两个字段：
1. "criteria" — 结构化搜索条件
2. "explanation" — 中文简短说明理解的需求（1-2句话）

criteria字段（全部可选，没提到就不填）：
- gender: "male" 或 "female"
- ageMin, ageMax: 年龄范围
- cities: 城市列表，如["上海","杭州"]
- interests: 兴趣爱好，如["读书","旅行","摄影","编程","做饭"]
- personality: 性格特质，如["温柔","上进","幽默","独立","善良"]
- education: 学历，如"本科","硕士","博士"
- occupation: 职业，如["程序员","设计师","医生","老师"]
- hasHouse: 是否要求有房
- hasCar: 是否要求有车
- travelExperience: 去过的地方，如["美国","日本","欧洲"]
- keywords: 其他关键词

注意：
- "有上进心""三观正""经济条件好"→ personality或keywords
- "在上海工作"→ cities:["上海"]
- "25到30岁"→ ageMin:25, ageMax:30
- "去过美国"→ travelExperience:["美国"]
- "会弹吉他""喜欢摄影"→ interests:["吉他","摄影"]
- "做IT的""程序员"→ occupation:["程序员"]
- 只返回JSON，不要其他文字`;

  const resp = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      temperature: 0.1,
      max_tokens: 500,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`DeepSeek API error: ${resp.status} ${err}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || "";

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { criteria: {}, explanation: `理解了你的需求：${query}` };
  }
}

// ── Scoring ──

type Candidate = {
  id: string;
  name: string | null;
  age: number | null;
  gender: string | null;
  bio: string | null;
  avatarUrl: string | null;
  photo1: string | null;
  photo2: string | null;
  photo3: string | null;
  region: string | null;
  keywords: string | null;
  activityTags: string | null;
  occupation: string | null;
  profileAnswers: unknown;
  popularityScore: number;
};

function scoreCandidate(c: Candidate, criteria: SearchCriteria): { score: number; reasons: string[] } {
  let score = 50;
  const reasons: string[] = [];

  // Gender hard filter
  if (criteria.gender && c.gender && c.gender !== criteria.gender) {
    return { score: -1, reasons: [] };
  }

  // Age hard filter
  if (c.age) {
    if (criteria.ageMin && c.age < criteria.ageMin) return { score: -1, reasons: [] };
    if (criteria.ageMax && c.age > criteria.ageMax) return { score: -1, reasons: [] };
  }

  // City match
  if (criteria.cities?.length && c.region) {
    const matched = criteria.cities.some((city) => c.region?.includes(city));
    if (matched) {
      score += 20;
      reasons.push(`📍 ${c.region}`);
    }
  }

  // Interest match (from keywords + activityTags + bio)
  const searchText = [c.keywords, c.activityTags, c.bio, JSON.stringify(c.profileAnswers || "")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (criteria.interests?.length) {
    for (const interest of criteria.interests) {
      if (searchText.includes(interest.toLowerCase())) {
        score += 12;
        reasons.push(`🎯 喜欢${interest}`);
      }
    }
  }

  // Personality match
  if (criteria.personality?.length) {
    for (const trait of criteria.personality) {
      if (searchText.includes(trait.toLowerCase())) {
        score += 10;
        reasons.push(`✨ ${trait}`);
      }
    }
  }

  // Occupation match
  if (criteria.occupation?.length) {
    const occText = (c.occupation || "") + " " + (c.bio || "");
    for (const occ of criteria.occupation) {
      if (occText.toLowerCase().includes(occ.toLowerCase())) {
        score += 15;
        reasons.push(`💼 ${occ}`);
      }
    }
  }

  // Travel experience
  if (criteria.travelExperience?.length) {
    for (const place of criteria.travelExperience) {
      if (searchText.includes(place)) {
        score += 15;
        reasons.push(`✈️ 去过${place}`);
      }
    }
  }

  // Keyword fuzzy match
  if (criteria.keywords?.length) {
    for (const kw of criteria.keywords) {
      if (searchText.includes(kw.toLowerCase())) {
        score += 6;
        reasons.push(kw);
      }
    }
  }

  // Popularity bonus
  score += Math.min(10, Math.floor((c.popularityScore || 0) / 10));

  return { score: Math.min(99, Math.max(1, score)), reasons: reasons.slice(0, 5) };
}

// ── Main handler ──

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ code: -1, msg: "请先登录" }, { status: 401 });
    }

    const body = await req.json();
    const query = (body.query || "").trim();
    if (!query) {
      return NextResponse.json({ code: -1, msg: "请输入你想找的人的描述" }, { status: 400 });
    }

    // Step 1: DeepSeek parses natural language
    let criteria: SearchCriteria;
    let explanation: string;

    try {
      const parsed = await parseQueryWithAI(query);
      criteria = parsed.criteria;
      explanation = parsed.explanation;
    } catch (err) {
      console.error("DeepSeek parse error:", err);
      return NextResponse.json({
        code: -1,
        msg: "AI 暂时无法理解你的需求，请换一种方式描述",
      });
    }

    // Step 2: Build Prisma query
    const where: Record<string, unknown> = {
      id: { not: user.id },
      role: { not: "admin" },
      deletedAt: null,
    };

    if (criteria.gender) {
      where.gender = criteria.gender;
    }
    if (criteria.ageMin || criteria.ageMax) {
      where.age = {};
      if (criteria.ageMin) (where.age as Record<string, number>).gte = criteria.ageMin;
      if (criteria.ageMax) (where.age as Record<string, number>).lte = criteria.ageMax;
    }

    // Step 3: Query with preference relation
    const candidates = await prisma.user.findMany({
      where,
      include: {
        preference: {
          select: {
            region: true,
            keywords: true,
            matchTypes: true,
            activityTags: true,
            chatPace: true,
            meetPreference: true,
            emotionStyle: true,
          },
        },
      },
      take: 500,
    });

    // Step 4: Flatten and score
    const enriched: Candidate[] = candidates.map((u) => ({
      id: u.id,
      name: u.name,
      age: u.age,
      gender: u.gender,
      bio: u.bio,
      avatarUrl: u.avatarUrl,
      photo1: u.photo1,
      photo2: u.photo2,
      photo3: u.photo3,
      region: u.preference?.region || null,
      keywords: u.preference?.keywords || null,
      activityTags: u.preference?.activityTags || null,
      occupation: null, // Not in schema, use bio
      profileAnswers: u.profileAnswers,
      popularityScore: u.popularityScore,
    }));

    const scored = enriched
      .map((c) => {
        const { score, reasons } = scoreCandidate(c, criteria);
        return { ...c, score, reasons };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const aiSummary =
      scored.length > 0
        ? `找到 ${scored.length} 个符合"${explanation}"的人：`
        : `没有找到完全符合"${explanation}"的人，试试放宽条件？`;

    return NextResponse.json({
      code: 0,
      data: {
        summary: aiSummary,
        matches: scored.map((r) => ({
          id: r.id,
          name: r.name,
          age: r.age,
          gender: r.gender,
          bio: r.bio,
          avatarUrl: r.avatarUrl,
          photo1: r.photo1,
          matchScore: r.score,
          matchReasons: r.reasons,
          region: r.region,
        })),
      },
    });
  } catch (err) {
    console.error("Search API error:", err);
    return NextResponse.json({ code: -1, msg: "搜索出错了，请稍后再试" }, { status: 500 });
  }
}
