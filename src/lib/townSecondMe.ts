import { getOwnerInformationText } from "@/lib/ownerInformation";
import { TOWN_CATEGORY_TAXONOMY, type TownCategory, extractJsonArray } from "@/lib/townTaxonomy";

const BASE_URL = process.env.SECONDME_API_BASE_URL;

async function chatStreamToText(accessToken: string, systemPrompt: string, message: string): Promise<string | null> {
  if (!BASE_URL) return null;
  const res = await fetch(`${BASE_URL}/api/secondme/chat/stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, systemPrompt }),
  });

  if (!res.ok || !res.body) return null;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let doneAll = false;

  while (!doneAll) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") {
        doneAll = true;
        break;
      }
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) content += delta;
      } catch {
        // ignore parse errors
      }
    }
  }

  const cleaned = content.replace(/\s+/g, " ").trim();
  return cleaned || null;
}

export async function generateTownTitleSecondMe(accessToken: string, userId: string, postContent: string) {
  const ownerText = (await getOwnerInformationText(userId)).trim();
  const systemPrompt =
    "你是丘比小镇的文案助手。你需要根据用户的正文，生成一个中文一句话标题。要求：1) 不超过 30 个汉字；2) 直接输出标题本身；3) 不要加引号；4) 不要解释。";

  const message = `用户正文：${postContent}\n\n（可参考，但不要照抄）：用户信息库：${ownerText || "（空）"}`;
  const raw = await chatStreamToText(accessToken, systemPrompt, message);
  if (!raw) return null;
  return raw.replace(/[“”"']/g, "").slice(0, 40).trim();
}

export async function classifyTownCategoriesSecondMe(accessToken: string, postContent: string): Promise<TownCategory[] | null> {
  const systemPrompt =
    "你是丘比小镇的分类助手。请根据用户正文内容，从给定分类里选择 1~3 个最贴切的标签。输出要求：只输出 JSON 数组（例如：[\"比赛队友\",\"创业伙伴\"]），不要输出任何其它文字。分类列表如下：";

  const taxonomy = TOWN_CATEGORY_TAXONOMY.join("、");
  const message = `用户正文：${postContent}\n\n分类列表：${taxonomy}`;

  const raw = await chatStreamToText(accessToken, systemPrompt, message);
  if (!raw) return null;

  const arr = extractJsonArray(raw);
  if (!arr) return null;

  const normalized: TownCategory[] = [];
  for (const x of arr) {
    const s = String(x ?? "").trim();
    if (!s) continue;
    if ((TOWN_CATEGORY_TAXONOMY as readonly string[]).includes(s)) normalized.push(s as TownCategory);
  }
  if (normalized.length === 0) return null;
  // 去重 + 只保留最多 3 个
  return Array.from(new Set(normalized)).slice(0, 3);
}

