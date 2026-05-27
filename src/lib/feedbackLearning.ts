import { prisma } from "@/lib/db";
import { candidateSignalTags, mergeWeightedTags } from "@/lib/preferenceSignals";

type FeedbackInput = {
  userId: string;
  matchId: string;
  vibeScore: number;
  valuesScore: number;
  potentialScore: number;
  comment?: string | null;
};

function sentimentWeight(input: FeedbackInput) {
  const avg = (input.vibeScore + input.valuesScore + input.potentialScore) / 3;
  const text = input.comment ?? "";
  const positiveText = /喜欢|舒服|合拍|想继续|有趣|真诚|稳定|心动/.test(text);
  const negativeText = /不适合|尴尬|无聊|冒犯|压力|不舒服|没感觉|敷衍/.test(text);

  if (avg >= 4 || positiveText) return 2;
  if (avg <= 2 || negativeText) return -2;
  if (avg >= 3.5) return 1;
  if (avg <= 2.5) return -1;
  return 0;
}

export async function learnFromMatchFeedback(input: FeedbackInput) {
  const weight = sentimentWeight(input);
  if (weight === 0) return { learned: false, reason: "neutral_feedback" };

  const match = await prisma.match.findFirst({
    where: { id: input.matchId, userId: input.userId },
    include: { targetUser: { include: { preference: true } } },
  });
  if (!match) return { learned: false, reason: "missing_match" };

  const tags = candidateSignalTags(match.targetUser).slice(0, 16);
  if (tags.length === 0) return { learned: false, reason: "no_candidate_tags" };

  const existing = await prisma.userPreferenceSignal.findUnique({
    where: { userId: input.userId },
  });

  const likedTraits = weight > 0
    ? mergeWeightedTags(existing?.likedTraitsJson, tags, weight)
    : mergeWeightedTags(existing?.likedTraitsJson, tags, -1);
  const unlikedTraits = weight < 0
    ? mergeWeightedTags(existing?.unlikedTraitsJson, tags, Math.abs(weight))
    : mergeWeightedTags(existing?.unlikedTraitsJson, tags, -1);

  const signalData = {
    likedTraitsJson: { tags: likedTraits },
    unlikedTraitsJson: { tags: unlikedTraits },
    photoPreferenceJson: { source: "feedback", updatedAt: new Date().toISOString() },
    geoPreferenceJson: { source: "feedback", updatedAt: new Date().toISOString() },
    professionPreferenceJson: {
      tags: likedTraits.filter((x) => /设计|产品|工程|艺术|创业|学生|经理/.test(x.tag)),
    },
  };

  await prisma.userPreferenceSignal.upsert({
    where: { userId: input.userId },
    create: { userId: input.userId, ...signalData },
    update: signalData,
  });

  return {
    learned: true,
    weight,
    tags,
  };
}
