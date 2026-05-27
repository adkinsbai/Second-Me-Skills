import { IMAGE_DATA_PREFIX } from "@/lib/utils";

/**
 * 从真人聊天文本中提取可写入「主人信息库」的轻量摘录（非 LLM，避免成本与延迟）。
 */
export function excerptForOwnerLearning(content: string): string | null {
  const raw = String(content ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith(IMAGE_DATA_PREFIX)) return null;
  const t = raw.replace(/\s+/g, " ");
  if (t.length < 2) return null;
  const clipped = t.length > 220 ? `${t.slice(0, 220)}…` : t;
  return `真人聊天风格/表达：${clipped}`;
}
