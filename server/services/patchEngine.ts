import { validateSyntax } from "./syntaxService";
import {
  DiffBlockInput,
  ApplyBlockResult,
  CondensedRange,
  findCondensedRange,
  applyBlockToContent,
} from "../../src/utils/patchMatcher";

export interface BlockApplyOutcome {
  finalContent: string;
  blockErrors: string[];
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

  for (const block of blocks) {
    const result = applyBlockToContent(currentContent, block);
    if (result.success && result.newContent !== undefined) {
      currentContent = result.newContent;
    } else if (result.error) {
      blockErrors.push(result.error);
    }
  }

  return { finalContent: currentContent, blockErrors };
}

export {
  type DiffBlockInput,
  type ApplyBlockResult,
  type CondensedRange,
  findCondensedRange,
  applyBlockToContent,
  validateSyntax,
};
