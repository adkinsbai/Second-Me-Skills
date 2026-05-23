/**
 * Act API：发送 actionControl，解析 SSE 流中的 JSON 结果
 */

export interface ActStreamOptions {
  message: string;
  sessionId?: string;
  actionControl: string;
}

export async function streamAct(
  options: ActStreamOptions,
  onChunk: (data: unknown) => void,
  onSession?: (sessionId: string) => void
): Promise<void> {
  const res = await fetch("/api/act/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  if (!res.ok || !res.body) throw new Error("Act stream failed");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("event: session")) continue;
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.sessionId) onSession?.(parsed.sessionId);
          if (parsed.choices?.[0]?.delta?.content) onChunk(parsed);
          else if (parsed.result) onChunk(parsed);
        } catch {
          // 忽略非 JSON 行
        }
      }
    }
  }
}
