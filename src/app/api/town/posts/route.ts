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

  if (accessToken) {
    try {
      const secCategories = await classifyTownCategoriesSecondMe(accessToken, safeContent);
      if (secCategories && secCategories.length > 0) categories = secCategories;
    } catch {
      // ignore secondme errors
    }
    try {
      const secTitle = await generateTownTitleSecondMe(accessToken, sessionUser.id, safeContent);
      if (secTitle) title = secTitle;
    } catch {
      // ignore secondme errors
    }
  }

  const fallbackCategories = classifyTownCategoriesHeuristic(safeContent);
  categories = categories && categories.length > 0 ? categories : fallbackCategories;
  title = title ?? generateTownTitleHeuristic(safeContent, categories);

  const post = await prisma.townPost.create({
    data: {
      userId: sessionUser.id,
      title: String(title).slice(0, 50),
      content: safeContent,
      categoriesJson: JSON.stringify(categories.slice(0, 3)),
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

