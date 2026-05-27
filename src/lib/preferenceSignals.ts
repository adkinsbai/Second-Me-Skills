import type { User, UserPreference } from "@prisma/client";
import { extractProfileTraits, type UserWithPreference } from "@/lib/matchStory";
import { parseProfileArray } from "@/lib/utils";

export type WeightedTag = { tag: string; count: number };

type CandidateWithPreference = User & { preference: UserPreference | null };

function cleanTag(raw: unknown): string {
  return String(raw ?? "").trim();
}

export function weightedTagsFromJson(raw: unknown): WeightedTag[] {
  const input = raw && typeof raw === "object" && "tags" in raw ? (raw as { tags?: unknown }).tags : raw;
  if (!Array.isArray(input)) return [];

  const counts = new Map<string, number>();
  for (const item of input) {
    if (typeof item === "string") {
      const tag = cleanTag(item);
      if (tag) counts.set(tag, (counts.get(tag) ?? 0) + 1);
      continue;
    }

    if (item && typeof item === "object" && "tag" in item) {
      const tag = cleanTag((item as { tag?: unknown }).tag);
      const count = Number((item as { count?: unknown }).count ?? 1);
      if (tag) counts.set(tag, (counts.get(tag) ?? 0) + (Number.isFinite(count) ? Math.max(1, count) : 1));
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));
}

export function mergeWeightedTags(existing: unknown, additions: string[], weight = 1, limit = 24): WeightedTag[] {
  const counts = new Map<string, number>();
  for (const item of weightedTagsFromJson(existing)) counts.set(item.tag, item.count);
  for (const raw of additions) {
    const tag = cleanTag(raw);
    if (!tag) continue;
    counts.set(tag, Math.max(0, (counts.get(tag) ?? 0) + weight));
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

export function candidateSignalTags(candidate: CandidateWithPreference): string[] {
  const withPreference = candidate as UserWithPreference;
  const traits = extractProfileTraits(withPreference);
  return Array.from(
    new Set(
      [
        ...traits.tags,
        ...traits.professions,
        ...traits.cities,
        traits.region,
        ...parseProfileArray(candidate.preference?.matchTypes),
        ...parseProfileArray(candidate.preference?.activityTags),
        ...parseProfileArray(candidate.preference?.keywords),
      ].filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    )
  ).slice(0, 24);
}

export function preferenceSignalScore(
  signal: { likedTraitsJson: unknown; unlikedTraitsJson?: unknown } | null | undefined,
  candidate: CandidateWithPreference,
  options: { likedWeight?: number; unlikedWeight?: number } = {}
): number {
  if (!signal) return 0;
  const likedWeight = options.likedWeight ?? 4;
  const unlikedWeight = options.unlikedWeight ?? -5;
  const liked = new Map(weightedTagsFromJson(signal.likedTraitsJson).map((item) => [item.tag.toLowerCase(), item.count]));
  const unliked = new Map(weightedTagsFromJson(signal.unlikedTraitsJson).map((item) => [item.tag.toLowerCase(), item.count]));
  if (liked.size === 0 && unliked.size === 0) return 0;

  return candidateSignalTags(candidate).reduce((score, tag) => {
    const key = tag.toLowerCase();
    return score + (liked.get(key) ?? 0) * likedWeight + (unliked.get(key) ?? 0) * unlikedWeight;
  }, 0);
}

export function preferenceSignalHits(
  signal: { likedTraitsJson: unknown; unlikedTraitsJson?: unknown } | null | undefined,
  candidate: CandidateWithPreference,
  limit = 4
) {
  if (!signal) return { liked: [] as string[], unliked: [] as string[] };
  const tags = candidateSignalTags(candidate).map((tag) => ({ raw: tag, key: tag.toLowerCase() }));
  const liked = new Set(weightedTagsFromJson(signal.likedTraitsJson).map((item) => item.tag.toLowerCase()));
  const unliked = new Set(weightedTagsFromJson(signal.unlikedTraitsJson).map((item) => item.tag.toLowerCase()));
  return {
    liked: tags.filter((tag) => liked.has(tag.key)).map((tag) => tag.raw).slice(0, limit),
    unliked: tags.filter((tag) => unliked.has(tag.key)).map((tag) => tag.raw).slice(0, limit),
  };
}
