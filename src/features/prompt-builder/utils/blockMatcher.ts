import { DiffBlock } from "../../../types/patch";

/**
 * Determines whether a SEARCH block can be located inside a file's current
 * contents. Tries three progressively looser strategies:
 *  1. Exact match after normalizing line endings.
 *  2. Match after trimming each line (tolerates whitespace/indentation drift).
 *  3. Match after stripping comments/whitespace entirely (tolerates minor
 *     formatting changes made to the file since the AI generated the diff).
 *
 * Pure function: no React, no network calls — safe to unit test directly.
 */
export function matchesFileContent(search: string, content: string): boolean {
  const normContent = content.replace(/\r\n/g, "\n");
  const normSearch = search.replace(/\r\n/g, "\n");

  if (normContent.includes(normSearch)) return true;

  const searchLines = normSearch
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const contentLines = normContent
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (
    searchLines.length > 0 &&
    contentLines.join("\n").includes(searchLines.join("\n"))
  ) {
    return true;
  }

  const tokenize = (str: string) =>
    str
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "")
      .replace(/\{\s*["']\s*["']\s*\}/g, "")
      .replace(/[\s,'"`();]+/g, "");

  const tokenSearch = tokenize(normSearch);
  const tokenContent = tokenize(normContent);
  return tokenSearch.length > 0 && tokenContent.includes(tokenSearch);
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
