import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const POLL_MS = 800;
const MAX_DURATION_MS = 55_000; // Neon serverless safe limit

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id: matchId } = await params;

  const match = await prisma.match.findFirst({
    where: { id: matchId, userId: user.id },
    select: { id: true, userId: true, targetUserId: true },
  });
  if (!match) {
    return new Response("Not found", { status: 404 });
  }

  const afterParam = request.nextUrl.searchParams.get("after");
  let lastSeenAt = afterParam ? new Date(afterParam) : new Date(Date.now() - 5000);

  const pairMatches = await prisma.match.findMany({
    where: {
      OR: [
        { userId: user.id, targetUserId: match.targetUserId },
        { userId: match.targetUserId, targetUserId: user.id },
      ],
    },
    select: { id: true, userId: true, targetUserId: true },
  });
  const matchMetaMap = new Map(pairMatches.map((m) => [m.id, m]));
  const pairMatchIds = pairMatches.map((m) => m.id);
  const otherUserId = match.targetUserId;

  const encoder = new TextEncoder();
  const startedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // client disconnected
        }
      };

      // Initial heartbeat
      send("connected", { ok: true });

      const poll = async () => {
        if (Date.now() - startedAt > MAX_DURATION_MS) {
          send("reconnect", { reason: "timeout" });
          controller.close();
          return;
        }

        try {
          const otherReads = await prisma.matchRead.findMany({
            where: { userId: otherUserId, matchId: { in: pairMatchIds } },
            select: { matchId: true, lastReadAt: true },
          });
          const otherReadAtMap = new Map(
            otherReads.map((r) => [r.matchId, r.lastReadAt])
          );

          const newMessages = await prisma.matchMessage.findMany({
            where: {
              matchId: { in: pairMatchIds },
              senderType: { in: ["user_self", "user_target"] },
              createdAt: { gt: lastSeenAt },
            },
            orderBy: { createdAt: "asc" },
            take: 30,
          });

          if (newMessages.length > 0) {
            lastSeenAt = newMessages[newMessages.length - 1].createdAt;

            const mapped = newMessages
              .map((m) => {
                const owner = matchMetaMap.get(m.matchId);
                if (!owner) return null;
                const senderType: "user_self" | "user_target" =
                  owner.userId === user.id
                    ? m.senderType === "user_self"
                      ? "user_self"
                      : "user_target"
                    : m.senderType === "user_self"
                      ? "user_target"
                      : "user_self";
                const readByOther =
                  senderType === "user_self" &&
                  (otherReadAtMap.get(m.matchId)?.getTime() ?? 0) >=
                    m.createdAt.getTime();
                return {
                  id: m.id,
                  senderType,
                  content: m.content,
                  createdAt: m.createdAt.toISOString(),
                  readByOther,
                };
              })
              .filter(Boolean);

            if (mapped.length > 0) {
              send("messages", mapped);
            }
          } else {
            // Check if read status changed
            const latestSelfMsg = await prisma.matchMessage.findFirst({
              where: {
                matchId: { in: pairMatchIds },
                senderType: "user_self",
              },
              orderBy: { createdAt: "desc" },
              select: { id: true, createdAt: true, matchId: true },
            });
            if (latestSelfMsg) {
              const readAt =
                otherReadAtMap.get(latestSelfMsg.matchId)?.getTime() ?? 0;
              if (readAt >= latestSelfMsg.createdAt.getTime()) {
                send("read_update", { ok: true });
              }
            }
          }
        } catch {
          // DB error - keep alive
        }

        await new Promise((r) => setTimeout(r, POLL_MS));
        poll();
      };

      poll();
    },
    cancel() {
      // Client disconnected
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
