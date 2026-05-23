import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const conversations = await prisma.townConversation.findMany({
    where: { OR: [{ requesterId: user.id }, { candidateId: user.id }] },
    include: {
      post: { select: { id: true, title: true, categoriesJson: true } },
      requester: { select: { id: true, name: true, avatarUrl: true } },
      candidate: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const conversationIds = conversations.map((c) => c.id);
  if (conversationIds.length === 0) {
    return NextResponse.json({ code: 0, data: { groups: [] } });
  }

  const latestMessages = await prisma.townConversationMessage.findMany({
    where: { conversationId: { in: conversationIds } },
    orderBy: { createdAt: "desc" },
    distinct: ["conversationId"],
    select: { conversationId: true, senderUserId: true, content: true, createdAt: true },
  });
  const latestMap = new Map(latestMessages.map((m) => [m.conversationId, m]));

  const reads = await prisma.townConversationRead.findMany({
    where: { conversationId: { in: conversationIds }, userId: user.id },
    select: { conversationId: true, lastReadAt: true },
  });
  const readMap = new Map(reads.map((r) => [r.conversationId, r.lastReadAt]));

  const epoch = new Date(0);

  const unreadCounts = await Promise.all(
    conversations.map(async (c) => {
      const lastReadAt = readMap.get(c.id) ?? epoch;
      const count = await prisma.townConversationMessage.count({
        where: {
          conversationId: c.id,
          senderUserId: { not: user.id },
          createdAt: { gt: lastReadAt },
        },
      });
      return { conversationId: c.id, count };
    })
  );
  const unreadMap = new Map(unreadCounts.map((x) => [x.conversationId, x.count]));

  const groupMap = new Map<
    string,
    {
      post: { id: string; title: string; categories: string[] };
      conversations: Array<{
        conversationId: string;
        otherUser: { id: string; name: string | null; avatarUrl: string | null };
        lastMessage: { content: string; createdAt: string } | null;
        unreadCount: number;
      }>;
    }
  >();

  for (const c of conversations) {
    const postId = c.postId;
    const group =
      groupMap.get(postId) ??
      ({
        post: {
          id: c.post.id,
          title: c.post.title,
          categories: parseCategoriesJson(c.post.categoriesJson),
        },
        conversations: [],
      } as any);

    const otherUser = c.requesterId === user.id ? c.candidate : c.requester;
    const latest = latestMap.get(c.id) ?? null;

    group.conversations.push({
      conversationId: c.id,
      otherUser: { id: otherUser.id, name: otherUser.name, avatarUrl: otherUser.avatarUrl },
      lastMessage: latest
        ? { content: latest.content.slice(0, 120), createdAt: latest.createdAt.toISOString() }
        : null,
      unreadCount: unreadMap.get(c.id) ?? 0,
    });

    groupMap.set(postId, group as any);
  }

  return NextResponse.json({
    code: 0,
    data: { groups: Array.from(groupMap.values()) },
  });
}

