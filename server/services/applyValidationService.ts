import { fileExists, readTextFile, resolvePath } from "../adapters/fsAdapter";
import {
  applyBlocksSequentially,
  validateSyntax,
  DiffBlockInput,
} from "./patchEngine";
import { validateLint } from "./lintService";

export interface FileValidationOutcome {
  content?: string;
  errors: string[];
}

// Real leaked markers are their own line, at the start of the line, exactly
// as the diff format requires (see diffParser.ts). A file that legitimately
// implements/documents the patch format — this one included — will contain
// these strings as quoted substrings inside otherwise-valid code; only a
// bare marker AT LINE START is actually corruption. Anchoring to ^ avoids
// flagging our own detection logic every time this file is edited.
//
// Reports both the line number and which match tier produced the content —
// "condensed" strips comments from the whole file and splices into a
// non-original-offset copy, making it the likeliest source of an
// unexplained leak, so it's called out explicitly rather than left for the
// reader to infer.
function detectLeakedMarker(
  finalContent: string,
  file: string,
  matchStrategies: string[],
): string | null {
  const leakedMarkerMatch = finalContent.match(
    /^(<{7} SEARCH|={7}|>{7} REPLACE)\s*$/m,
  );
  if (!leakedMarkerMatch || leakedMarkerMatch.index === undefined) return null;

  const lineNumber = finalContent
    .slice(0, leakedMarkerMatch.index)
    .split("\n").length;
  const strategyNote =
    matchStrategies.length > 0
      ? ` (blocks applied via: ${matchStrategies.join(", ")})`
      : "";
  const riskFlag = matchStrategies.includes("condensed")
    ? " — includes a condensed-token-stream match, the highest-risk tier"
    : "";

  return `Leaked patch marker "${leakedMarkerMatch[1]}" detected in generated content for ${file}:${lineNumber}. Application aborted to prevent corruption.${strategyNote}${riskFlag}`;
}

function parseSyntaxError(errorStr: string): { message: string; line: number } | null {
  const match = errorStr.match(/: (.*) \(line (\d+)\)$/);
  if (!match) return null;
  return {
    message: match[1],
    line: parseInt(match[2], 10),
  };
}

/**
 * Attempts deterministic, in-memory heuristic auto-healing for common diff boundary
 * collisions (e.g. duplicate closing tokens like `););`, orphaned brackets, or duplicate adjacent lines).
 * Every candidate string is strictly vetted against `validateSyntax()`; if no candidate achieves
 * 0 syntax errors, null is returned and the original error is preserved.
 */
const DUPLICATE_PATTERNS: [RegExp, string][] = [
  [/\}\s*\)\s*;\s*\)\s*;/g, "});"],
  [/\}\s*\)\s*;\s*\);/g, "});"],
  [/\}\s*\)\s*;\s*;/g, "});"],
  [/\);\s*\);/g, ");"],
  [/\}\s*\}/g, "}"],
  [/\)\s*\)/g, ")"],
  [/;\s*;/g, ";"],
  [/\]\s*\]/g, "]"],
  [/\}\s*,\s*\[\]\s*\);/g, "}, []);"],
];

function addDuplicateLineCandidates(lines: string[], errIdx: number, add: (l: string[]) => void): void {
  for (let offset = -1; offset <= 1; offset++) {
    const i = errIdx + offset;
    if (i > 0 && i < lines.length && lines[i - 1].trim() && lines[i - 1].trim() === lines[i].trim()) {
      const copy = [...lines];
      copy.splice(i, 1);
      add(copy);
    }
  }
}

function addPunctuationCandidates(lines: string[], errIdx: number, add: (l: string[]) => void): void {
  for (let offset = -1; offset <= 1; offset++) {
    const i = errIdx + offset;
    if (i < 0 || i >= lines.length) continue;
    for (const [pattern, replacement] of DUPLICATE_PATTERNS) {
      if (pattern.test(lines[i])) {
        const copy = [...lines];
        copy[i] = lines[i].replace(pattern, replacement);
        add(copy);
      }
    }
  }
}

function addOrphanCharCandidates(lines: string[], i: number, char: string, add: (l: string[]) => void): void {
  const line = lines[i];
  if (line.trim() === char || line.trim() === `${char};`) {
    const copy = [...lines];
    copy.splice(i, 1);
    add(copy);
  }
  const last = line.lastIndexOf(char);
  if (last !== -1) {
    const copy = [...lines];
    copy[i] = line.slice(0, last) + line.slice(last + 1);
    add(copy);
  }
  const first = line.indexOf(char);
  if (first !== -1 && first !== last) {
    const copy = [...lines];
    copy[i] = line.slice(0, first) + line.slice(first + 1);
    add(copy);
  }
}

function addOrphanDelimiterCandidates(
  lines: string[],
  errIdx: number,
  message: string,
  add: (l: string[]) => void,
): void {
  const match = message.match(/Unexpected ["'`](.)["'`]/);
  if (!match) return;
  for (let offset = -1; offset <= 1; offset++) {
    const i = errIdx + offset;
    if (i >= 0 && i < lines.length) {
      addOrphanCharCandidates(lines, i, match[1], add);
    }
  }
}

function addMissingBraceCandidates(lines: string[], errIdx: number, add: (l: string[]) => void): void {
  for (let offset = -1; offset <= 0; offset++) {
    const i = errIdx + offset;
    if (i >= 0 && i < lines.length) {
      const indent = lines[i].match(/^[ \t]*/)?.[0] || "";
      const copy1 = [...lines];
      copy1.splice(i, 0, `${indent}}`);
      add(copy1);

      const copy2 = [...lines];
      copy2.splice(i, 0, `${indent}};`);
      add(copy2);
    }
  }
}

/**
 * Attempts deterministic, in-memory heuristic auto-healing for common diff boundary
 * collisions (e.g. duplicate closing tokens like `););`, orphaned brackets, or duplicate adjacent lines).
 * Every candidate string is strictly vetted against `validateSyntax()`; if no candidate achieves
 * 0 syntax errors, null is returned and the original error is preserved.
 */
function attemptSyntaxAutoHeal(
  content: string,
  file: string,
  syntaxErrorMsg: string,
): string | null {
  const parsed = parseSyntaxError(syntaxErrorMsg);
  if (!parsed || isNaN(parsed.line) || parsed.line < 1) {
    return null;
  }

  const lines = content.split("\n");
  const errIdx = parsed.line - 1;
  const candidates: string[] = [];

  const add = (newLines: string[]) => {
    const text = newLines.join("\n");
    if (text !== content && !candidates.includes(text)) {
      candidates.push(text);
    }
  };

  addDuplicateLineCandidates(lines, errIdx, add);
  addPunctuationCandidates(lines, errIdx, add);
  addOrphanDelimiterCandidates(lines, errIdx, parsed.message, add);
  addMissingBraceCandidates(lines, errIdx, add);

  for (const candidate of candidates) {
    if (!validateSyntax(candidate, file)) {
      return candidate;
    }
  }

  return null;
}

function tryReverseOrderAutoHeal(
  initialContent: string,
  file: string,
  blocks: DiffBlockInput[],
): string | null {
  if (blocks.length <= 1) return null;
  console.log(`[Validation] 🔄 [Auto-Heal Strategy A] Testing reverse-order application (bottom-to-top)...`);
  const attempt = applyBlocksSequentially(initialContent, [...blocks].reverse());
  if (attempt.blockErrors.length > 0) {
    console.log(`[Validation] ❌ [Auto-Heal Strategy A] Reverse-order produced block matching errors.`);
    return null;
  }
  if (detectLeakedMarker(attempt.finalContent, file, attempt.matchStrategies)) return null;
  const syntaxErr = validateSyntax(attempt.finalContent, file);
  if (syntaxErr) {
    console.log(`[Validation] ❌ [Auto-Heal Strategy A] Reverse-order also produced syntax error: ${syntaxErr}`);
    return null;
  }
  console.log(`[Validation] 🎉 [Auto-Heal Strategy A] SUCCEEDED! Reverse-order application eliminated syntax error.`);
  return attempt.finalContent;
}

function tryBoundaryAutoHeal(
  finalContent: string,
  file: string,
  matchStrategies: string[],
  syntaxError: string,
): string | null {
  console.log(`[Validation] 🩹 [Auto-Heal Strategy B] Attempting token boundary healing around error line...`);
  const healed = attemptSyntaxAutoHeal(finalContent, file, syntaxError);
  if (healed && !detectLeakedMarker(healed, file, matchStrategies)) {
    console.log(`[Validation] 🎉 [Auto-Heal Strategy B] SUCCEEDED! Splicing collision repaired successfully.`);
    return healed;
  }
  console.log(`[Validation] ❌ [Auto-Heal Strategy B] Could not deterministically heal the syntax error.`);
  return null;
}

// Runs the full per-file gauntlet — block application, leaked-marker
// corruption check, syntax check, auto-heal retry, and lint — and reports
// either the file's final content (ready to write) or every error found along the way.
export async function validateAndBuildFileContent(
  targetRepoPath: string,
  file: string,
  blocks: DiffBlockInput[],
): Promise<FileValidationOutcome> {
  const fullPath = resolvePath(targetRepoPath, file);
  const initialContent = fileExists(fullPath) ? readTextFile(fullPath) : "";

  const outcome = applyBlocksSequentially(initialContent, blocks);
  if (outcome.blockErrors.length > 0) {
    return { errors: outcome.blockErrors };
  }

  let finalContent = outcome.finalContent;
  const leakError = detectLeakedMarker(finalContent, file, outcome.matchStrategies);
  if (leakError) {
    return { errors: [leakError] };
  }

  let syntaxError = validateSyntax(finalContent, file);
  if (syntaxError) {
    console.log(`\n[Validation] ⚠️ Pre-flight syntax error detected in "${file}":\n             ${syntaxError}`);
    console.log(`[Validation] 🩺 Launching Auto-Heal pipeline...`);
    const healed =
      tryReverseOrderAutoHeal(initialContent, file, blocks) ??
      tryBoundaryAutoHeal(finalContent, file, outcome.matchStrategies, syntaxError);
    if (healed) {
      finalContent = healed;
      syntaxError = null;
    }
  }

  if (syntaxError) {
    return { errors: [syntaxError] };
  }

  const lintErrors = await validateLint(targetRepoPath, finalContent, file);
  if (lintErrors.length > 0) {
    return { errors: lintErrors };
  }

  return { content: finalContent, errors: [] };
}
