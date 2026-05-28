import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401, message: "未登录" }, { status: 401 });

  const { id: matchId } = await params;
  const match = await prisma.match.findFirst({
    where: { id: matchId, userId: user.id },
  });
  if (!match) return NextResponse.json({ code: 404, message: "匹配不存在" }, { status: 404 });

  await prisma.$transaction([
    prisma.matchMessage.deleteMany({ where: { matchId } }),
    prisma.matchScore.deleteMany({ where: { matchId } }),
    prisma.matchFeedback.deleteMany({ where: { matchId } }),
    prisma.matchRead.deleteMany({ where: { matchId } }),
    prisma.match.delete({ where: { id: matchId } }),
  ]);

  return NextResponse.json({ code: 0, data: { deleted: true } });
}
