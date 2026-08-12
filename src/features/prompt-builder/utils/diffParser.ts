import { DiffBlock } from "../../../types/patch";

interface IdleParseResult {
  nextFile: string;
  nextState?: "SEARCH";
  moveBlock?: DiffBlock;
}

function parseIdleLine(trimmed: string, currentFile: string): IdleParseResult {
  const fileMatch = trimmed.match(
    /^(?:FILE|OVERWRITE FILE|File|Path|###|\*\*)\s*:?\s*[`"']?([^`"']+\.[a-zA-Z0-9]+)[`"']?/i,
  );
  const nextFile = fileMatch ? fileMatch[1] : currentFile;

  const moveMatch = trimmed.match(
    /^(MOVE|RENAME|Move|Rename)\s*:?\s*[`"']?([^`"'\n]+?)[`"']?\s*(?:->|→|to)\s*[`"']?([^`"'\n]+?)[`"']?$/i,
  );

  let moveBlock: DiffBlock | undefined;
  if (moveMatch) {
    const isRename = /^rename$/i.test(moveMatch[1]);
    moveBlock = {
      id: "",
      file: moveMatch[2].trim(),
      status: "match",
      search: "",
      replace: "",
      type: "move",
      changeType: isRename ? "RENAME" : "MOVE",
      moveTo: moveMatch[3].trim(),
    };
  }

  const isSearchStart = trimmed === "<<<<<<< SEARCH";
  return {
    nextFile,
    nextState: isSearchStart ? "SEARCH" : undefined,
    moveBlock,
  };
}

function parseCreateOverwrites(
  rawText: string,
  blocks: DiffBlock[],
  startIndex: number,
): void {
  const createRegex =
    /(?:Create|Overwriting|File:)[ \t]*['"]?([^'":\n]+?\.[a-zA-Z0-9]+)['"]?:?[ \t]*\n```[a-zA-Z]*\n([\s\S]*?)\n```/gi;
  let match;
  let index = startIndex;

  while ((match = createRegex.exec(rawText)) !== null) {
    const filePath = match[1].trim();
    const replaceContent = match[2];
    const isDuplicate = blocks.some(
      (b) => b.file === filePath && b.replace === replaceContent,
    );
    if (!isDuplicate) {
      console.log(`[Parser] 📝 Found Create/Overwrite block for ${filePath}`);
      blocks.push({
        id: String(index++),
        file: filePath,
        status: "match",
        search: "",
        replace: replaceContent,
        changeType: "CREATE",
      });
    }
  }
}

export function parseDiffBlocks(rawText: string): DiffBlock[] {
  console.log("[Parser] Starting parse. Input length:", rawText?.length);
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r\n|\n|\r/);
  const blocks: DiffBlock[] = [];
  let index = 1;

  let state: "IDLE" | "SEARCH" | "REPLACE" = "IDLE";
  let currentSearch: string[] = [];
  let currentReplace: string[] = [];
  let currentFile = "Active File";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (state === "IDLE") {
      const { nextFile, nextState, moveBlock } = parseIdleLine(
        trimmed,
        currentFile,
      );
      currentFile = nextFile;
      if (moveBlock) {
        moveBlock.id = String(index++);
        blocks.push(moveBlock);
      }
      if (nextState) {
        state = nextState;
        currentSearch = [];
        currentReplace = [];
      }
    } else if (state === "SEARCH") {
      if (trimmed === "=======") {
        state = "REPLACE";
      } else {
        currentSearch.push(line);
      }
    } else if (state === "REPLACE") {
      if (trimmed === ">>>>>>> REPLACE") {
        const sText = currentSearch
          .join("\n")
          .replace(/^```[a-zA-Z]*\n/, "")
          .replace(/\n```$/, "");
        const rText = currentReplace
          .join("\n")
          .replace(/^```[a-zA-Z]*\n/, "")
          .replace(/\n```$/, "");

        blocks.push({
          id: String(index++),
          file: currentFile,
          status: "match",
          search: sText,
          replace: rText,
          changeType: sText.trim() === "" ? "CREATE" : "EDIT",
        });

        state = "IDLE";
        currentFile = "Active File";
      } else {
        currentReplace.push(line);
      }
    }
  }

  parseCreateOverwrites(rawText, blocks, index);

  console.log(`[Parser] Final returned blocks:`, blocks);
  return blocks;
}

/**
 * Parses a Discovery Mode response: a plain list of file paths the AI says
 * it needs to see, one per line, formatted "- path/to/file.ext — reason".
 * Only the path is extracted; the reason is for the human reading the
 * response, not for the app. Deliberately much simpler than
 * parseDiffBlocks — no state machine needed for a flat list.
 */
export function parseFileList(
  rawText: string,
  validFiles?: string[],
): string[] {
  if (!rawText || !rawText.trim()) return [];

  const validSet =
    validFiles && validFiles.length > 0 ? new Set(validFiles) : null;
  const lines = rawText.split(/\r\n|\n|\r/);
  const files: string[] = [];

  const addFile = (candidate: string) => {
    const cleaned = candidate
      .trim()
      .replace(/^[`"']|[`"']$/g, "")
      .replace(/[,:]$/, "");
    if (!cleaned) return;

    if (validSet) {
      if (validSet.has(cleaned) && !files.includes(cleaned)) {
        files.push(cleaned);
      }
    } else if (!files.includes(cleaned)) {
      files.push(cleaned);
    }
  };

  const lineRegex =
    /^(?:-\s*|\*\s*|\d+\.\s*)?[`"']?([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+)[`"']?(?:\s*(?:—|-|:)\s*.*)?$/;
  const pathInLineRegex = /[`"']?([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+)[`"']?/g;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (
      !line ||
      line.startsWith("```") ||
      line.toUpperCase() === "FILES NEEDED:"
    )
      continue;

    const match = line.match(lineRegex);
    if (match) {
      addFile(match[1]);
    } else {
      let m: RegExpExecArray | null;
      while ((m = pathInLineRegex.exec(line)) !== null) {
        addFile(m[1]);
      }
    }
  }

  return files;
}
