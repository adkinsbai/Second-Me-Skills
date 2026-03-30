import { prisma } from "@/lib/db";

export async function getOwnerFacts(userId: string): Promise<string[]> {
  const rows = await prisma.ownerFact.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return rows.map((x) => x.content);
}

export async function appendOwnerFact(userId: string, fact: string, source = "manual"): Promise<void> {
  const content = String(fact).trim();
  if (!content) return;
  await prisma.ownerFact.create({
    data: {
      userId,
      source,
      content: content.slice(0, 1000),
    },
  });

  const allIds = await prisma.ownerFact.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (allIds.length > 80) {
    await prisma.ownerFact.deleteMany({
      where: { id: { in: allIds.slice(80).map((x) => x.id) } },
    });
  }
}

export async function getOwnerInformationText(userId: string): Promise<string> {
  const facts = await getOwnerFacts(userId);
  if (!facts.length) return "";
  return facts
    .slice(-20)
    .map((f, i) => `${i + 1}. ${f}`)
    .join("\n");
}

