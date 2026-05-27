export const IMAGE_DATA_PREFIX = "IMAGE_DATA:";

/**
 * Parse a JSON array string (or fall back to legacy delimiter-separated text)
 * into a clean string[].
 */
export function parseArray(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map((x) => String(x).trim()).filter(Boolean);
  } catch {
    // Fall through to legacy text parsing.
  }
  return raw
    .split(/[,，、|/\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Backward-compatible alias — preferred name in older call-sites. */
export const parseProfileArray = parseArray;
