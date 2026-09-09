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
  matchStrategy?: "full-overwrite" | "exact" | "fuzzy-indent" | "condensed" | "ast-structural";
}

export interface CondensedRange {
  start: number;
  end: number;
}

interface Token {
  char: string;
  index: number;
}

function skipComment(text: string, i: number): number {
  if (text.startsWith("/*", i)) {
    const end = text.indexOf("*/", i + 2);
    return end !== -1 ? end + 2 : text.length;
  }
  if (text.startsWith("//", i)) {
    const end = text.indexOf("\n", i + 2);
    return end !== -1 ? end + 1 : text.length;
  }
  return i;
}

function cleanChar(char: string, ignorePunc: boolean): string | null {
  if (ignorePunc) return /[,;'"`();]/.test(char) ? null : char;
  return char === "'" || char === "`" ? '"' : char;
}

function getCleanTokens(text: string, ignorePunctuation: boolean): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    if (/\s/.test(text[i])) {
      i++;
      continue;
    }
    const nextI = skipComment(text, i);
    if (nextI !== i) {
      i = nextI;
      continue;
    }
    const char = cleanChar(text[i], ignorePunctuation);
    if (char !== null) tokens.push({ char, index: i });
    i++;
  }
  return tokens;
}

function findSubsequence(haystack: Token[], needle: Token[]): number {
  const max = haystack.length - needle.length;
  for (let i = 0; i <= max; i++) {
    if (needle.every((tok, j) => haystack[i + j].char === tok.char)) return i;
  }
  return -1;
}

function expandRange(
  content: string,
  search: string,
  c: number,
  s: number,
  dir: -1 | 1,
): number {
  let ci = c;
  let si = s;
  while (
    ci + dir >= 0 &&
    ci + dir < content.length &&
    si + dir >= 0 &&
    si + dir < search.length
  ) {
    if (content[ci + dir] !== search[si + dir]) break;
    ci += dir;
    si += dir;
  }
  return ci;
}

function matchTokenRange(
  content: string,
  search: string,
  ignorePunc: boolean,
): CondensedRange | null {
  const sTokens = getCleanTokens(search, ignorePunc);
  if (sTokens.length === 0) return null;
  const cTokens = getCleanTokens(content, ignorePunc);
  const idx = findSubsequence(cTokens, sTokens);
  if (idx === -1) return null;

  const cStart = expandRange(content, search, cTokens[idx].index, sTokens[0].index, -1);
  const cEnd = expandRange(
    content,
    search,
    cTokens[idx + sTokens.length - 1].index,
    sTokens[sTokens.length - 1].index,
    1,
  );
  return { start: cStart, end: cEnd + 1 };
}

/**
 * Finds a condensed range match in content for search text.
 * Returns the exact start and end string indices in the original content.
 */
export function findCondensedRange(
  content: string,
  search: string,
): CondensedRange | null {
  return matchTokenRange(content, search, false) ?? matchTokenRange(content, search, true);
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

function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

function applyCondensedMatch(
  normContent: string,
  normSearch: string,
  normReplace: string,
): string | null {
  const range = findCondensedRange(normContent, normSearch);
  if (!range) return null;

  // Splice the replacement directly into the original content using the 
  // true character offsets mapped by the boundary-expanding tokenizer.
  // (The old implementation stripped comments from the ENTIRE file and 
  // returned it, permanently deleting all comments across the codebase!)
  return (
    normContent.slice(0, range.start) +
    normReplace +
    normContent.slice(range.end)
  );
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

  const normContent = normalizeText(content);
  const normSearch = normalizeText(block.search);
  const normReplace = normalizeText(block.replace);

  if (normContent.includes(normSearch)) {
    return {
      success: true,
      newContent: normContent.replace(normSearch, normReplace),
      matchStrategy: "exact",
    };
  }

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

  const condensedMatch = applyCondensedMatch(
    normContent,
    normSearch,
    normReplace,
  );
  if (condensedMatch !== null) {
    return {
      success: true,
      newContent: condensedMatch,
      matchStrategy: "condensed",
    };
  }

  return {
    success: false,
    error: `SEARCH block match failed for file: ${block.file}`,
  };
}
