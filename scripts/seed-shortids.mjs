import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

function genShortId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "QB";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

const users = await p.user.findMany({ where: { shortId: null }, select: { id: true } });
console.log("users needing shortId:", users.length);

for (const u of users) {
  let sid;
  let attempts = 0;
  do {
    sid = genShortId();
    const existing = await p.user.findUnique({ where: { shortId: sid } });
    if (!existing) break;
    attempts++;
  } while (attempts < 30);

  await p.user.update({ where: { id: u.id }, data: { shortId: sid } });
  console.log("  set", u.id.slice(-6), "->", sid);
}

await p.$disconnect();
console.log("done");
