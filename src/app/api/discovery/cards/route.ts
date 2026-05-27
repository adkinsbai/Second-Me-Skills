import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runMatchPipeline } from "@/lib/matchPipeline";
import { buildMatchStory, extractProfileTraits, type UserWithPreference } from "@/lib/matchStory";
import { parseProfileArray } from "@/lib/utils";
import { preferenceSignalHits, preferenceSignalScore } from "@/lib/preferenceSignals";

/** 把站内相对路径补成绝对 URL，避免本机开发时 <img> 请求错主机导致「刷不出图」 */
function requestOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || "localhost:3000";
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto =
    forwardedProto ||
    (process.env.VERCEL === "1"
      ? "https"
      : host.startsWith("localhost") || host.startsWith("127.")
        ? "http"
        : "https");
  return `${proto}://${host}`;
}

/**
 * 解析以 `/` 开头的资源路径时优先用 NEXT_PUBLIC_SITE_URL（本机连本地库但图片挂在 Vercel 时常用）。
 */
function pathBaseForRelativeAssets(origin: string): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  return fromEnv && /^https?:\/\//i.test(fromEnv) ? fromEnv : origin;
}

function normalizeMediaUrl(raw: string | null | undefined, pathBase: string): string | null {
  if (raw == null) return null;
  const u = String(raw).trim();
  if (!u) return null;
  if (u.startsWith("data:")) return u;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) return `${pathBase}${u}`;
  return u;
}

function distanceKm(aLat?: number | null, aLng?: number | null, bLat?: number | null, bLng?: number | null) {
  if (aLat == null || aLng == null || bLat == null || bLng == null) return null;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(2 * r * Math.asin(Math.sqrt(h)));
}

function photosFor(user: UserWithPreference, pathBase: string) {
  const urls = [user.photo1, user.photo2, user.photo3, user.avatarUrl]
    .map((x) => normalizeMediaUrl(typeof x === "string" ? x : null, pathBase))
    .filter((x): x is string => !!x);
  const seen = new Set<string>();
  return urls.filter((u) => (seen.has(u) ? false : (seen.add(u), true)));
}

export async function GET(request: NextRequest) {
  const origin = requestOrigin(request);
  const pathBase = pathBaseForRelativeAssets(origin);
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ code: 401 }, { status: 401 });

  const self = await prisma.user.findUnique({
    where: { id: user.id },
    include: { preference: true, preferenceSignal: true },
  });
  if (!self) return NextResponse.json({ code: 404, message: "用户不存在" }, { status: 404 });

  const [matched, swiped] = await Promise.all([
    prisma.match.findMany({
      where: { userId: user.id },
      select: { targetUserId: true },
    }),
    prisma.userSwipeDecision.findMany({
      where: { viewerId: user.id },
      select: { targetUserId: true },
    }),
  ]);
  const excludeIds = [
    user.id,
    ...matched.map((m) => m.targetUserId),
    ...swiped.map((s) => s.targetUserId),
  ];

  const pipeline = await runMatchPipeline(user.id, excludeIds);
  const selfWithPref = self as UserWithPreference;
  const ranked = pipeline.ranked
    .map((item) => {
      const candidate = item.candidate as UserWithPreference;
      const km = distanceKm(self.latitude, self.longitude, candidate.latitude, candidate.longitude);
      const sameRegion =
        !!self.preference?.region &&
        !!candidate.preference?.region &&
        self.preference.region.trim().toLowerCase() === candidate.preference.region.trim().toLowerCase();
      const geoBoost = km != null ? Math.max(0, 30 - Math.min(30, km / 5)) : sameRegion ? 12 : 0;
      return {
        item,
        rankScore: item.scored.finalScore + geoBoost + preferenceSignalScore(self.preferenceSignal, candidate, { likedWeight: 8, unlikedWeight: -8 }),
        km,
        sameRegion,
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 20);

  const cards = ranked.map(({ item, km, sameRegion }) => {
    const candidate = item.candidate as UserWithPreference;
    const traits = extractProfileTraits(candidate);
    const preferenceHits = preferenceSignalHits(self.preferenceSignal, candidate);
    return {
      id: candidate.id,
      name: candidate.name,
      age: candidate.age,
      bio: candidate.bio,
      avatarUrl: normalizeMediaUrl(candidate.avatarUrl, pathBase),
      photos: photosFor(candidate, pathBase),
      region: candidate.preference?.region ?? "",
      distanceKm: km,
      distanceLabel: km != null ? `${km}km` : sameRegion ? "同城" : candidate.preference?.region ?? "距离未知",
      tags: traits.tags.slice(0, 6),
      story: buildMatchStory(selfWithPref, candidate),
      preferenceHits,
      modelSignals: {
        rhythm: item.scored.explain.rhythm,
        emotion: item.scored.explain.emotion,
        values: item.scored.explain.values,
        attachment: item.scored.explain.attachment,
      },
    };
  });

  return NextResponse.json({
    code: 0,
    data: {
      cards,
      pipeline: {
        stages: pipeline.stages,
        searchedUserCount: pipeline.stages[0]?.count ?? 0,
      },
    },
  });
}
