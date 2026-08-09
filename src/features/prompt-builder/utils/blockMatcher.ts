import { DiffBlock } from "../../../types/patch";
import { applyBlockToContent } from "../../../utils/patchMatcher";

/**
 * Determines whether a SEARCH block can be located inside a file's current
 * contents.
 *
 * Uses the exact same underlying applyBlockToContent engine as the server
 * (Exact, Fuzzy Indentation, and Condensed Token Stream matchers) to guarantee
 * the UI badge accurately reflects whether the block will actually apply.
 *
 * Pure function: no React, no network calls — safe to unit test directly.
 */
export function matchesFileContent(search: string, content: string): boolean {
  const result = applyBlockToContent(content, {
    file: "match-test", // Dummy filename to bypass "Active File" skip checks
    search,
    replace: "", // Replacement string doesn't matter for matching
  });
  return result.success;
}

/**
 * Stamps each parsed diff block with a "match" / "no-match" status by
 * checking it against fetched file contents. Pure function — the caller
 * owns fetching `contents` and updating React state.
 */
export function validateBlocks(
  blocks: DiffBlock[],
  contents: Record<string, string>,
): DiffBlock[] {
  return blocks.map((block) => {
    if (block.type === "move") {
      const sourceExists = !!contents[block.file];
      return {
        ...block,
        status: sourceExists ? ("match" as const) : ("no-match" as const),
      };
    }

    if (!block.search.trim() || block.file === "Active File") {
      return { ...block, status: "match" as const };
    }

    const content = contents[block.file];
    if (!content) return { ...block, status: "no-match" as const };

    return {
      ...block,
      status: matchesFileContent(block.search, content)
        ? ("match" as const)
        : ("no-match" as const),
    };
  });
}
