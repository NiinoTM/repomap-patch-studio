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
function validateMoveBlock(
  block: DiffBlock,
  contents: Record<string, string>,
): DiffBlock {
  const sourceExists = Boolean(contents[block.file]);
  return {
    ...block,
    status: sourceExists ? "match" : "no-match",
  };
}

function resolveTargetFile(
  block: DiffBlock,
  contents: Record<string, string>,
  simulatedContents: Record<string, string>,
): { targetFile: string; isCodeMatched: boolean } {
  if (
    block.file &&
    block.file !== "Active File" &&
    (contents[block.file] || simulatedContents[block.file])
  ) {
    return { targetFile: block.file, isCodeMatched: false };
  }

  if (block.search.trim()) {
    for (const [filePath, content] of Object.entries(simulatedContents)) {
      if (matchesFileContent(block.search, content)) {
        return { targetFile: filePath, isCodeMatched: true };
      }
    }
  }

  return { targetFile: block.file, isCodeMatched: false };
}

function validateEmptySearchBlock(
  block: DiffBlock,
  targetFile: string,
  isCodeMatched: boolean,
  simulatedContents: Record<string, string>,
): DiffBlock {
  const isValid = Boolean(targetFile && targetFile !== "Active File");
  if (isValid && !block.ignored) {
    simulatedContents[targetFile] = block.replace;
  }
  return {
    ...block,
    status: isValid ? "match" : "no-match",
    matchedFile: isValid ? targetFile : undefined,
    isCodeMatched,
  };
}

function evaluateSequentialMatch(
  block: DiffBlock,
  targetFile: string,
  initialContent: string | undefined,
  currentSimulated: string | undefined,
  simulatedContents: Record<string, string>,
  isCodeMatched: boolean,
): DiffBlock {
  if (!targetFile || currentSimulated === undefined) {
    return { ...block, status: "no-match", matchedFile: undefined, isCodeMatched: false };
  }

  if (matchesFileContent(block.search, currentSimulated)) {
    if (!block.ignored) {
      const applied = applyBlockToContent(currentSimulated, {
        file: targetFile,
        search: block.search,
        replace: block.replace,
      });
      if (applied.success && applied.newContent !== undefined) {
        simulatedContents[targetFile] = applied.newContent;
      }
    }

    const inInitial = Boolean(
      initialContent !== undefined && matchesFileContent(block.search, initialContent),
    );

    return {
      ...block,
      status: inInitial ? "match" : "chained",
      matchedFile: targetFile,
      isCodeMatched,
    };
  }

  const isCollision = Boolean(
    initialContent !== undefined && matchesFileContent(block.search, initialContent),
  );

  return {
    ...block,
    status: isCollision ? "collision" : "no-match",
    matchedFile: isCollision ? targetFile : undefined,
    isCodeMatched,
  };
}

/**
 * Stamps each parsed diff block with a "match", "collision", "chained", or "no-match" status by
 * simulating sequential in-memory application against file contents.
 */
export function validateBlocks(
  blocks: DiffBlock[],
  contents: Record<string, string>,
): DiffBlock[] {
  const simulatedContents: Record<string, string> = { ...contents };

  return blocks.map((block) => {
    if (block.type === "move") {
      return validateMoveBlock(block, contents);
    }

    const { targetFile, isCodeMatched } = resolveTargetFile(
      block,
      contents,
      simulatedContents,
    );

    if (!block.search.trim()) {
      return validateEmptySearchBlock(
        block,
        targetFile,
        isCodeMatched,
        simulatedContents,
      );
    }

    return evaluateSequentialMatch(
      block,
      targetFile,
      contents[targetFile],
      simulatedContents[targetFile],
      simulatedContents,
      isCodeMatched,
    );
  });
}
