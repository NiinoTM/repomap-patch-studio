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
  const contentEntries = Object.entries(contents);

  return blocks.map((block) => {
    if (block.type === "move") {
      const sourceExists = !!contents[block.file];
      return {
        ...block,
        status: sourceExists ? ("match" as const) : ("no-match" as const),
      };
    }

    if (block.file && block.file !== "Active File" && contents[block.file]) {
      const content = contents[block.file];
      const isMatch =
        !block.search.trim() || matchesFileContent(block.search, content);
      if (isMatch) {
        return {
          ...block,
          status: "match" as const,
          matchedFile: block.file,
          isCodeMatched: false,
        };
      }
    }

    if (block.search.trim()) {
      for (const [filePath, content] of contentEntries) {
        if (matchesFileContent(block.search, content)) {
          return {
            ...block,
            status: "match" as const,
            matchedFile: filePath,
            isCodeMatched:
              block.file === "Active File" || block.file !== filePath,
          };
        }
      }
    }

    return {
      ...block,
      status:
        !block.search.trim() && block.file === "Active File"
          ? ("match" as const)
          : ("no-match" as const),
      matchedFile: undefined,
      isCodeMatched: false,
    };
  });
}
