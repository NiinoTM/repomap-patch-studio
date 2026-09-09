import { validateSyntax } from "./syntaxService";
import {
  DiffBlockInput,
  ApplyBlockResult,
  CondensedRange,
  findCondensedRange,
  applyBlockToContent,
} from "../../src/utils/patchMatcher";
import { applyAstMatch } from "./astMatcher";

export interface BlockApplyOutcome {
  finalContent: string;
  blockErrors: string[];
  // Match strategy per successfully-applied block, in application order —
  // lets a downstream corruption check (e.g. the leaked-marker check in
  // applyPatchService.ts) name which tier is implicated instead of just
  // reporting "corruption detected" with no way to tell exact matches
  // from the riskier condensed-token fallback.
  matchStrategies: string[];
}

/**
 * Applies every block scoped to a single file against a running in-memory
 * buffer, in order — so a later block in the same transaction can target
 * text introduced by an earlier block in that same transaction, instead of
 * every block being matched independently against the original on-disk
 * content (which is what silently broke a two-block same-file fix earlier).
 *
 * A block that fails to match is recorded and skipped, and the buffer is
 * left unchanged so later, unrelated blocks for the same file still get a
 * fair shot — this maximizes how many real problems surface in one report.
 */
export function applyBlocksSequentially(
  initialContent: string,
  blocks: DiffBlockInput[],
): BlockApplyOutcome {
  let currentContent = initialContent;
  const blockErrors: string[] = [];
  const matchStrategies: string[] = [];

  for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
    const block = blocks[bIdx];
    console.log(`\n--------------------------------------------------`);
    console.log(`[PatchEngine] 📦 Processing Block ${bIdx + 1}/${blocks.length} for file: "${block.file}"`);

    // 1. Try AST-based structural matching first for supported code files
    const astResult = applyAstMatch(currentContent, block.search, block.replace, block.file);
    if (astResult !== null) {
      console.log(`[PatchEngine] ✅ Applied Block ${bIdx + 1} via "ast-structural" strategy.`);
      currentContent = astResult;
      matchStrategies.push("ast-structural");
      continue;
    }

    // 2. Fall back to standard block matcher (exact, fuzzy-indent, condensed)
    console.log(`[PatchEngine] 🔄 Running text-based fallback matcher (exact -> fuzzy-indent -> condensed)...`);
    const result = applyBlockToContent(currentContent, block);
    if (result.success && result.newContent !== undefined) {
      console.log(`[PatchEngine] ✅ Applied Block ${bIdx + 1} via "${result.matchStrategy}" strategy.`);
      currentContent = result.newContent;
      if (result.matchStrategy) matchStrategies.push(result.matchStrategy);
    } else if (result.error) {
      console.log(`[PatchEngine] ❌ Block ${bIdx + 1} FAILED: ${result.error}`);
      blockErrors.push(result.error);
    }
  }

  return { finalContent: currentContent, blockErrors, matchStrategies };
}

export {
  type DiffBlockInput,
  type ApplyBlockResult,
  type CondensedRange,
  findCondensedRange,
  applyBlockToContent,
  validateSyntax,
  applyAstMatch,
};
