export interface DiffBlockInput {
  file: string;
  search: string;
  replace: string;
  type?: "edit" | "move";
  moveTo?: string;
}

export interface ApplyBlockResult {
  success: boolean;
  newContent?: string;
  error?: string;
  // Which tier of applyBlockToContent produced newContent. Surfaced so
  // downstream validation errors (see applyPatchService.ts's leaked-marker
  // check) can name the actual culprit instead of just "corruption
  // detected" — "condensed" is the risky, comment-stripping fallback and
  // is the tier most likely to explain an unexplained leak.
  matchStrategy?: "full-overwrite" | "exact" | "fuzzy-indent" | "condensed";
}

export interface CondensedRange {
  start: number;
  end: number;
}

/**
 * Finds a condensed range match in content for search text.
 */
export function findCondensedRange(
  content: string,
  search: string,
): CondensedRange | null {
  const preCleanContent = content
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "")
    .replace(/\{\s*["']\s*["']\s*\}/g, "");
  const cleanSearch = search
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "")
    .replace(/\{\s*["']\s*["']\s*\}/g, "")
    .replace(/[\s,'"`();]+/g, "");

  if (!cleanSearch) return null;

  let cIdx = 0;
  let sIdx = 0;
  let startMatchPos = -1;

  while (cIdx < preCleanContent.length && sIdx < cleanSearch.length) {
    if (/[\s,'"`();]/.test(preCleanContent[cIdx])) {
      cIdx++;
      continue;
    }

    if (preCleanContent[cIdx] === cleanSearch[sIdx]) {
      if (sIdx === 0) startMatchPos = cIdx;
      sIdx++;
      cIdx++;
    } else {
      if (startMatchPos !== -1) {
        cIdx = startMatchPos + 1;
        startMatchPos = -1;
        sIdx = 0;
      } else {
        cIdx++;
      }
    }
  }

  if (sIdx === cleanSearch.length && startMatchPos !== -1) {
    return { start: startMatchPos, end: cIdx };
  }

  return null;
}

export function applyFuzzyIndentationMatch(
  normContent: string,
  normSearch: string,
  normReplace: string,
): string | null {
  const searchLines = normSearch
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const contentLines = normContent.split("\n");

  let matchIndex = -1;
  for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
    let isCandidate = true;
    for (let j = 0; j < searchLines.length; j++) {
      if (contentLines[i + j].trim() !== searchLines[j]) {
        isCandidate = false;
        break;
      }
    }
    if (isCandidate) {
      matchIndex = i;
      break;
    }
  }

  if (matchIndex !== -1) {
    const indentMatch = contentLines[matchIndex].match(/^[ \t]*/);
    const indent = indentMatch ? indentMatch[0] : "";
    const replaceLines = normReplace.split("\n").map((line) => {
      return line.trim() ? indent + line.replace(/^[ \t]*/, "") : "";
    });

    contentLines.splice(matchIndex, searchLines.length, ...replaceLines);
    return contentLines.join("\n");
  }

  return null;
}

/**
 * Pure In-Memory Block Application Engine (Exact, Fuzzy Indentation & Condensed Token Stream).
 */
export function applyBlockToContent(
  content: string,
  block: DiffBlockInput,
): ApplyBlockResult {
  if (!block.search || !block.search.trim() || block.file === "Active File") {
    return {
      success: true,
      newContent: block.replace,
      matchStrategy: "full-overwrite",
    };
  }

  const normContent = content.replace(/\r\n/g, "\n");
  const normSearch = block.search.replace(/\r\n/g, "\n");
  const normReplace = block.replace.replace(/\r\n/g, "\n");

  // 1. Exact Match
  if (normContent.includes(normSearch)) {
    return {
      success: true,
      newContent: normContent.replace(normSearch, normReplace),
      matchStrategy: "exact",
    };
  }

  // 2. Smart Fuzzy Indentation Match
  const fuzzyMatch = applyFuzzyIndentationMatch(
    normContent,
    normSearch,
    normReplace,
  );
  if (fuzzyMatch !== null) {
    return {
      success: true,
      newContent: fuzzyMatch,
      matchStrategy: "fuzzy-indent",
    };
  }

  // 3. Condensed Token Stream Replacement — last resort. Strips ALL
  // whitespace/quotes/comments before matching, so it can false-positive
  // on short/generic search text, and it splices into a comment-stripped
  // copy of the WHOLE file, not just the matched region — a successful
  // match here still discards every comment outside the edited span.
  // Tagged "condensed" specifically so callers can flag it as the
  // higher-risk path rather than treating all three tiers as equivalent.
  const range = findCondensedRange(normContent, normSearch);
  if (range) {
    const cleanNormContent = normContent
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "")
      .replace(/\{\s*["']\s*["']\s*\}/g, "");
    const newContent =
      cleanNormContent.slice(0, range.start) +
      normReplace +
      cleanNormContent.slice(range.end);
    return { success: true, newContent, matchStrategy: "condensed" };
  }

  return {
    success: false,
    error: `SEARCH block match failed for file: ${block.file}`,
  };
}
