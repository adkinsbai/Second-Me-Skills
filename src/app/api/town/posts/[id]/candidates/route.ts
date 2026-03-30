import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rankTownCandidates } from "@/lib/townMatching";

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

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "请先登录" }, { status: 401 });

  const postId = params.id;

  const post = await prisma.townPost.findFirst({
    where: { id: postId, userId: user.id },
    select: { id: true, content: true, categoriesJson: true },
  });
  if (!post) return NextResponse.json({ code: 404, message: "帖子不存在" }, { status: 404 });

  const postCategories = parseCategoriesJson(post.categoriesJson);
  const { candidates } = await rankTownCandidates({
    requesterId: user.id,
    postContent: post.content,
    postCategories,
    limit: 10,
  });

  const candidateUserIds = candidates.map((c) => c.id);
  const round = await prisma.townCandidateRound.create({
    data: {
      postId: post.id,
      requesterId: user.id,
      candidateUserIdsJson: JSON.stringify(candidateUserIds),
    },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json({
    code: 0,
    data: {
      roundId: round.id,
      candidates,
    },
  });
}

