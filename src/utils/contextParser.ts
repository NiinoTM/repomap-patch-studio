import {
  ContextSelectionItemSchema,
  getContextItemKey,
  type ContextSelectionItem,
} from "../types/contextSelectionItem";

function parseRangeMatch(line: string): ContextSelectionItem | null {
  const match =
    line.match(/^(?:READ:\s*)?['"]?([^:'"\s]+?):\[(\d+)[\s,-]+(\d+)\]['"]?/i) ||
    line.match(/^@?([^:\s]+?):\[(\d+)[\s,-]+(\d+)\]/);
  if (!match) return null;
  const start = parseInt(match[2], 10);
  const end = parseInt(match[3], 10);
  return {
    type: "range",
    path: match[1].replace(/^@/, "").trim(),
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

function parseSymbolMatch(line: string): ContextSelectionItem | null {
  const inMatch = line.match(
    /^INSPECT:\s*['"]?([a-zA-Z0-9_$]+)['"]?\s+IN\s+['"]?([^'"\s]+?)['"]?(?:\s+|$)/i,
  );
  if (inMatch) {
    return {
      type: "symbol",
      path: inMatch[2].replace(/^@/, "").trim(),
      symbol: inMatch[1].trim(),
    };
  }

  const colonMatch = line.match(
    /^INSPECT:\s*['"]?([^:'"#\s]+?)[:#]([a-zA-Z0-9_$]+)['"]?(?:\s+|$)/i,
  );
  if (colonMatch) {
    return {
      type: "symbol",
      path: colonMatch[1].replace(/^@/, "").trim(),
      symbol: colonMatch[2].trim(),
    };
  }

  const hashMatch = line.match(/^@?([^#\s]+?)#([a-zA-Z0-9_$]+)/);
  if (hashMatch) {
    return {
      type: "symbol",
      path: hashMatch[1].replace(/^@/, "").trim(),
      symbol: hashMatch[2].trim(),
    };
  }

  return null;
}

function parseFileCandidate(line: string): ContextSelectionItem | null {
  const candidate = line
    .split(/\s+[—–]\s+|\s+--\s+|\s+-\s+|\s+\/\/\s+/)[0]
    .replace(/^@/, "")
    .replace(/^[`"']|[`"']$/g, "")
    .trim();

  if (!candidate) return null;

  const isValidPath =
    /^[a-zA-Z0-9_\-./]+\.[a-zA-Z0-9_-]+$/.test(candidate) ||
    candidate.includes("/") ||
    candidate.includes("\\");

  return isValidPath ? { type: "file", path: candidate } : null;
}

export function parseContextItem(
  input: string | ContextSelectionItem,
): ContextSelectionItem | null {
  if (!input) return null;
  if (typeof input !== "string") {
    const validated = ContextSelectionItemSchema.safeParse(input);
    return validated.success ? validated.data : null;
  }

  const cleanLine = input
    .trim()
    .replace(/^[-*•]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .trim();

  if (!cleanLine || /^FILES NEEDED:?$/i.test(cleanLine)) return null;

  return (
    parseRangeMatch(cleanLine) ||
    parseSymbolMatch(cleanLine) ||
    parseFileCandidate(cleanLine)
  );
}

function extractInlineRanges(text: string): ContextSelectionItem[] {
  const items: ContextSelectionItem[] = [];
  const patterns = [
    /READ:\s*['"]?([^:'"\s]+?):\[(\d+)[\s,-]+(\d+)\]['"]?/gi,
    /@([^:\s]+?):\[(\d+)[\s,-]+(\d+)\]/g,
  ];
  for (const pattern of patterns) {
    for (const m of text.matchAll(pattern)) {
      const start = parseInt(m[2], 10);
      const end = parseInt(m[3], 10);
      items.push({
        type: "range",
        path: m[1].replace(/^@/, "").trim(),
        start: Math.min(start, end),
        end: Math.max(start, end),
      });
    }
  }
  return items;
}

function extractInlineSymbols(text: string): ContextSelectionItem[] {
  const items: ContextSelectionItem[] = [];
  for (const m of text.matchAll(/INSPECT:\s*['"]?([a-zA-Z0-9_$]+)['"]?\s+IN\s+['"]?([^'"\s]+?)['"]?(?:\s+|$)/gi)) {
    items.push({ type: "symbol", path: m[2].replace(/^@/, "").trim(), symbol: m[1].trim() });
  }
  for (const m of text.matchAll(/INSPECT:\s*['"]?([^:'"#\s]+?)[:#]([a-zA-Z0-9_$]+)['"]?(?:\s+|$)/gi)) {
    items.push({ type: "symbol", path: m[1].replace(/^@/, "").trim(), symbol: m[2].trim() });
  }
  for (const m of text.matchAll(/@([^#\s]+?)#([a-zA-Z0-9_$]+)/g)) {
    items.push({ type: "symbol", path: m[1].replace(/^@/, "").trim(), symbol: m[2].trim() });
  }
  return items;
}

export function extractContextItemsFromText(text: string): ContextSelectionItem[] {
  if (!text || !text.trim()) return [];
  const results: ContextSelectionItem[] = [];
  const seenKeys = new Set<string>();

  const pushItem = (item: ContextSelectionItem | null) => {
    if (!item) return;
    const key = getContextItemKey(item);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      results.push(item);
    }
  };

  for (const line of text.split(/\r?\n/)) {
    pushItem(parseContextItem(line));
  }
  for (const item of extractInlineRanges(text)) {
    pushItem(item);
  }
  for (const item of extractInlineSymbols(text)) {
    pushItem(item);
  }

  return results;
}