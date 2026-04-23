import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentUserWithToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  classifyTownCategoriesHeuristic,
  generateTownTitleHeuristic,
} from "@/lib/townTaxonomy";
import { classifyTownCategoriesSecondMe, generateTownTitleSecondMe } from "@/lib/townSecondMe";

function parseCategoriesJson(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((x) => String(x)).filter(Boolean);
    return [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const mine = request.nextUrl.searchParams.get("mine") === "1";
  const posts = await prisma.townPost.findMany({
    where: mine ? { userId: user.id } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
    take: 60,
  });

  return NextResponse.json({
    code: 0,
    data: {
      posts: posts.map((p) => ({
        id: p.id,
        userId: p.userId,
        title: p.title,
        content: p.content,
        categories: parseCategoriesJson(p.categoriesJson),
        author: p.author,
        createdAt: p.createdAt.toISOString(),
      })),
    },
  });
}

export async function POST(request: NextRequest) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return NextResponse.json({ code: 401 }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const content = String(body?.content ?? "").trim();
  if (!content) return NextResponse.json({ code: 400, message: "正文不能为空" }, { status: 400 });
  const safeContent = content.slice(0, 600);

  // 1) 生成标题 + 分类
  const tokenUser = await getCurrentUserWithToken();
  const accessToken = tokenUser?.accessToken ?? null;

  let categories: string[] | null = null;
  let title: string | null = null;
  let categoriesFromSecondMe = false;
  let titleFromSecondMe = false;

  if (accessToken) {
    try {
      const secCategories = await classifyTownCategoriesSecondMe(accessToken, safeContent);
      if (secCategories && secCategories.length > 0) categories = secCategories;
      if (secCategories && secCategories.length > 0) categoriesFromSecondMe = true;
    } catch {
      // ignore secondme errors
    }
    try {
      const secTitle = await generateTownTitleSecondMe(accessToken, sessionUser.id, safeContent);
      if (secTitle) title = secTitle;
      if (secTitle) titleFromSecondMe = true;
    } catch {
      // ignore secondme errors
    }
  }

  const heuristicCategories = classifyTownCategoriesHeuristic(safeContent);
  let finalCategories = categories && categories.length > 0 ? categories : heuristicCategories;

  // 强校正：当本地强判定为某分类（非“其他”）时，如果 AI 分类没命中，则覆盖。
  // 解决示例：正文出现“打三角洲/射击/FPS/一起打”等时，AI 可能落到“其他”。
  const heuristicTop = heuristicCategories?.[0];
  let categoriesChangedByHeuristic = false;
  if (heuristicTop && heuristicTop !== "其他" && !finalCategories.includes(heuristicTop)) {
    finalCategories = [heuristicTop, ...finalCategories.filter((c) => c !== heuristicTop)].slice(0, 3);
    categoriesChangedByHeuristic = true;
  }

  // 若 AI 分类被强校正，则标题也同步用规则生成，避免“标题文案与分类不一致”
  if (titleFromSecondMe && categoriesChangedByHeuristic) {
    title = generateTownTitleHeuristic(safeContent, finalCategories);
  } else {
    title = title ?? generateTownTitleHeuristic(safeContent, finalCategories);
  }

  let post;
  try {
    post = await prisma.townPost.create({
      data: {
        userId: sessionUser.id,
        title: String(title).slice(0, 50),
        content: safeContent,
        categoriesJson: JSON.stringify(finalCategories.slice(0, 3)),
      },
      select: {
        id: true,
        userId: true,
        title: true,
        content: true,
        categoriesJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (err) {
    // 这里返回更可读的错误信息，便于定位线上数据库/表结构问题
    const msg = err instanceof Error ? err.message : String(err);
    console.error("TownPost.create failed:", msg);
    return NextResponse.json(
      {
        code: 500,
        message: `发布失败：数据库写入错误（${msg}）`,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    code: 0,
    data: {
      id: post.id,
      title: post.title,
      content: post.content,
      categories: parseCategoriesJson(post.categoriesJson),
      createdAt: post.createdAt.toISOString(),
    },
  });
}

