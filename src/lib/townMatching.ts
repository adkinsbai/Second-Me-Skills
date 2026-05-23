import { prisma } from "@/lib/db";
import { inferUserModel, scoreCompatibility } from "@/lib/userModeling";

export type TownCandidate = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  totalScore: number;
};

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function rankTownCandidates(params: {
  requesterId: string;
  postContent: string;
  postCategories: string[];
  limit?: number; // default 10
}) {
  const { requesterId, postContent, postCategories, limit = 10 } = params;

  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
    include: { preference: true },
  });
  if (!requester) return { candidates: [] as TownCandidate[] };

  const ownerFactsRows = await prisma.ownerFact.findMany({
    where: { userId: requesterId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { content: true },
  });

  const selfMsgRows = await prisma.matchMessage.findMany({
    where: { senderType: "user_self", match: { userId: requesterId } },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { content: true, createdAt: true },
  });

  const selfModel = inferUserModel({
    userId: requesterId,
    bio: requester.bio ?? "",
    keywords: postContent.slice(0, 500),
    matchTypes: JSON.stringify(postCategories.slice(0, 3)),
    chatPace: requester.preference?.chatPace ?? null,
    meetPreference: requester.preference?.meetPreference ?? null,
    emotionStyle: requester.preference?.emotionStyle ?? null,
    activityTags: requester.preference?.activityTags ?? null,
    ownerFacts: ownerFactsRows.map((x) => x.content),
    userMessages: selfMsgRows.map((x) => x.content),
    userMessageCreatedAt: selfMsgRows.map((x) => x.createdAt),
  });

  const region = requester.preference?.region?.trim().toLowerCase() ?? "";
  const ageMin = requester.preference?.ageMin ?? null;
  const ageMax = requester.preference?.ageMax ?? null;

  const excludeIds = [requesterId];

  const poolCandidates = await prisma.user.findMany({
    where: {
      id: { notIn: excludeIds },
      authProvider: { notIn: ["", "guest"] },
    },
    include: { preference: true },
    take: 60,
  });

  const rankedRaw = await Promise.all(
    poolCandidates.map(async (candidate) => {
      const candidatePref = candidate.preference;
      const candidateRegion = candidatePref?.region?.trim().toLowerCase() ?? "";
      if (region && candidateRegion && region !== candidateRegion) return null;

      const a1 = ageMin;
      const a2 = ageMax;
      const b1 = candidatePref?.ageMin ?? null;
      const b2 = candidatePref?.ageMax ?? null;
      if (a1 != null && a2 != null && b1 != null && b2 != null) {
        if (Math.max(a1, b1) > Math.min(a2, b2)) return null;
      }

      const factsRows = await prisma.ownerFact.findMany({
        where: { userId: candidate.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { content: true },
      });

      const msgRows = await prisma.matchMessage.findMany({
        where: { senderType: "user_self", match: { userId: candidate.id } },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { content: true, createdAt: true },
      });

      const targetModel = inferUserModel({
        userId: candidate.id,
        bio: candidate.bio,
        keywords: candidatePref?.keywords ?? null,
        matchTypes: candidatePref?.matchTypes ?? null,
        chatPace: candidatePref?.chatPace ?? null,
        meetPreference: candidatePref?.meetPreference ?? null,
        emotionStyle: candidatePref?.emotionStyle ?? null,
        activityTags: candidatePref?.activityTags ?? null,
        ownerFacts: factsRows.map((x) => x.content),
        userMessages: msgRows.map((x) => x.content),
        userMessageCreatedAt: msgRows.map((x) => x.createdAt),
      });

      const scored = scoreCompatibility(selfModel, targetModel);
      if (scored.hardRejectReasons.length > 0) return null;
      return {
        candidate,
        totalScore: scored.finalScore,
      };
    })
  );

  const ranked = rankedRaw
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => b.totalScore - a.totalScore);

  // 提供“换一批”的自然性：从前 2~3 倍的候选里随机抽取
  const topPool = ranked.slice(0, Math.max(limit * 2, 20));
  const picked = shuffle(topPool).slice(0, limit);

  const candidates: TownCandidate[] = picked.map((x) => ({
    id: x.candidate.id,
    name: x.candidate.name ?? null,
    avatarUrl: x.candidate.avatarUrl ?? null,
    bio: x.candidate.bio ?? null,
    totalScore: Math.round(x.totalScore),
  }));

  return { candidates };
}

