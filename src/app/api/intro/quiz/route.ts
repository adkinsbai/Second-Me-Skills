import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserWithToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { appendOwnerFact } from "@/lib/ownerInformation";

const BASE_URL = process.env.SECONDME_API_BASE_URL;

export async function POST(request: NextRequest) {
  const user = await getCurrentUserWithToken();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });
  const body = await request.json();
  const answers = Array.isArray(body.answers) ? body.answers : [];
  if (answers.length === 0) return NextResponse.json({ code: 400 }, { status: 400 });
  const content = answers
    .map((a: string, i: number) => `Q${i + 1}: ${String(a).slice(0, 500)}`)
    .join("\n");
  const noteContent = `[丘比·了解你] 4 个问题的回答：\n${content}`;

  // 把测验答案同步沉淀到本地 owner_information，保证“我的 Agent 介绍”会跟着更新
  await Promise.all(
    answers.slice(0, 10).map((a: string, i: number) =>
      appendOwnerFact(user.id, `主人回答 Q${i + 1}: ${String(a).slice(0, 500)}`)
    )
  );

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.accessToken && BASE_URL) {
    try {
      await fetch(`${BASE_URL}/api/secondme/note/add`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${dbUser.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: noteContent, memoryType: "TEXT" }),
      });
    } catch {
      // ignore
    }
  }
  return NextResponse.json({ code: 0 });
}
