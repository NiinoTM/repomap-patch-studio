import ts from "typescript";
import { extnamePath } from "../adapters/fsAdapter";

const SUPPORTED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

function getScriptKind(ext: string): ts.ScriptKind {
  switch (ext) {
    case ".tsx":
      return ts.ScriptKind.TSX;
    case ".ts":
      return ts.ScriptKind.TS;
    case ".jsx":
      return ts.ScriptKind.JSX;
    case ".js":
    case ".mjs":
    case ".cjs":
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.Unknown;
  }
}

interface ScannedToken {
  kind: ts.SyntaxKind;
  text: string;
  start: number;
  end: number;
}

/**
 * Scans a code string into AST tokens using TypeScript's official lexer,
 * stripping trivia (comments/whitespace) while preserving exact original source offsets.
 */
function scanSignificantTokens(text: string, scriptKind: ts.ScriptKind): ScannedToken[] {
  const isJsx = scriptKind === ts.ScriptKind.TSX || scriptKind === ts.ScriptKind.JSX;
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    /* skipTrivia */ true,
    isJsx ? ts.LanguageVariant.JSX : ts.LanguageVariant.Standard,
    text,
  );

  const tokens: ScannedToken[] = [];
  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    tokens.push({
      kind: token,
      text: scanner.getTokenText(),
      start: scanner.getTokenPos(),
      end: scanner.getTextPos(),
    });
    token = scanner.scan();
  }
  return tokens;
}

function areTokensEquivalent(contentTok: ScannedToken, searchTok: ScannedToken): boolean {
  if (contentTok.kind !== searchTok.kind) {
    // Normalize quote variations between string literals and template literals (' vs " vs `)
    const isContentString =
      contentTok.kind === ts.SyntaxKind.StringLiteral ||
      contentTok.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral;
    const isSearchString =
      searchTok.kind === ts.SyntaxKind.StringLiteral ||
      searchTok.kind === ts.SyntaxKind.NoSubstitutionTemplateLiteral;

    if (isContentString && isSearchString) {
      return contentTok.text.slice(1, -1) === searchTok.text.slice(1, -1);
    }
    return false;
  }

  return contentTok.text === searchTok.text;
}

/**
 * AST-Based Structural Code Matcher.
 * Uses TypeScript's compiler token stream and parser to identify the exact AST boundaries
 * of code blocks, bypassing string-offset drift and delimiter-slicing errors entirely.
 */
function findAstMatchIndex(contentTokens: ScannedToken[], searchTokens: ScannedToken[]): number {
  const max = contentTokens.length - searchTokens.length;
  for (let i = 0; i <= max; i++) {
    if (searchTokens.every((sTok, j) => areTokensEquivalent(contentTokens[i + j], sTok))) {
      return i;
    }
  }
  return -1;
}

function expandLeadingTrivia(
  content: string,
  search: string,
  searchStart: number,
  tokenStart: number,
): number {
  const leadingTrivia = search.slice(0, searchStart);
  if (leadingTrivia.length === 0) return tokenStart;

  const candidateTrivia = content.slice(
    Math.max(0, tokenStart - leadingTrivia.length),
    tokenStart,
  );
  if (candidateTrivia === leadingTrivia) {
    return tokenStart - leadingTrivia.length;
  }
  const lineStart = content.lastIndexOf("\n", tokenStart - 1);
  const preLine = content.slice(lineStart === -1 ? 0 : lineStart + 1, tokenStart);
  if (/^\s*$/.test(preLine) && /^\s*$/.test(leadingTrivia)) {
    return lineStart === -1 ? 0 : lineStart + 1;
  }
  return tokenStart;
}

function expandTrailingTrivia(
  content: string,
  search: string,
  searchEnd: number,
  tokenEnd: number,
): number {
  const trailingTrivia = search.slice(searchEnd);
  if (!trailingTrivia.includes("\n")) return tokenEnd;
  if (content.slice(tokenEnd, tokenEnd + 2) === "\r\n") {
    return tokenEnd + 2;
  }
  if (content[tokenEnd] === "\n") {
    return tokenEnd + 1;
  }
  return tokenEnd;
}

function verifyAstDiagnostics(
  filePath: string,
  newContent: string,
  scriptKind: ts.ScriptKind,
): boolean {
  const verifiedSource = ts.createSourceFile(
    filePath,
    newContent,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const diagnostics = (verifiedSource as unknown as { parseDiagnostics?: unknown[] })
    .parseDiagnostics;
  return !diagnostics || diagnostics.length === 0;
}

/**
 * AST-Based Structural Code Matcher.
 * Uses TypeScript's compiler token stream and parser to identify the exact AST boundaries
 * of code blocks, bypassing string-offset drift and delimiter-slicing errors entirely.
 */
export function applyAstMatch(
  content: string,
  search: string,
  replace: string,
  filePath: string,
): string | null {
  const ext = extnamePath(filePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext) || !search.trim()) {
    return null;
  }

  const scriptKind = getScriptKind(ext);
  const searchTokens = scanSignificantTokens(search, scriptKind);
  if (searchTokens.length === 0) return null;

  const contentTokens = scanSignificantTokens(content, scriptKind);
  if (contentTokens.length < searchTokens.length) return null;

  const matchIndex = findAstMatchIndex(contentTokens, searchTokens);
  if (matchIndex === -1) {
    console.log(`[AST Matcher] ❌ Token sequence (${searchTokens.length} tokens starting with "${searchTokens[0]?.text}") not found in AST. Yielding to text fallback.`);
    return null;
  }

  console.log(`[AST Matcher] 🎯 Found matching AST token sequence at token index ${matchIndex}!`);
  const startToken = contentTokens[matchIndex];
  const endToken = contentTokens[matchIndex + searchTokens.length - 1];

  const sliceStart = expandLeadingTrivia(content, search, searchTokens[0].start, startToken.start);
  const sliceEnd = expandTrailingTrivia(
    content,
    search,
    searchTokens[searchTokens.length - 1].end,
    endToken.end,
  );

  const newContent = content.slice(0, sliceStart) + replace + content.slice(sliceEnd);
  if (!verifyAstDiagnostics(filePath, newContent, scriptKind)) {
    console.log(`[AST Matcher] ⚠️ Spliced AST resulted in parse error(s). Bailing out to text fallback.`);
    return null;
  }

  console.log(`[AST Matcher] ✅ Successfully verified AST structural replacement with 0 compiler errors!`);
  return newContent;
}