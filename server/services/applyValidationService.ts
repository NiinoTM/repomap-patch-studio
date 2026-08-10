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

// Runs the full per-file gauntlet — block application, leaked-marker
// corruption check, syntax check, lint — and reports either the file's
// final content (ready to write) or every error found along the way.
// Split out of applyPatchService.ts so resolveEditWrites there stays
// focused on grouping blocks and aggregating results across files, rather
// than also owning the single-file validation sequence itself.
export async function validateAndBuildFileContent(
  targetRepoPath: string,
  file: string,
  blocks: DiffBlockInput[],
): Promise<FileValidationOutcome> {
  const fullPath = resolvePath(targetRepoPath, file);
  const initialContent = fileExists(fullPath) ? readTextFile(fullPath) : "";

  const { finalContent, blockErrors, matchStrategies } =
    applyBlocksSequentially(initialContent, blocks);

  if (blockErrors.length > 0) {
    return { errors: blockErrors };
  }

  const leakError = detectLeakedMarker(finalContent, file, matchStrategies);
  if (leakError) {
    return { errors: [leakError] };
  }

  const syntaxError = validateSyntax(finalContent, file);
  if (syntaxError) {
    return { errors: [syntaxError] };
  }

  const lintErrors = await validateLint(targetRepoPath, finalContent, file);
  if (lintErrors.length > 0) {
    return { errors: lintErrors };
  }

  return { content: finalContent, errors: [] };
}
