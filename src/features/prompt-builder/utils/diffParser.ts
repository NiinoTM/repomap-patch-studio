import { DiffBlock } from "../../../types/patch";

export function parseDiffBlocks(rawText: string): DiffBlock[] {
  console.log("[Parser] Starting parse. Input length:", rawText?.length);
  if (!rawText || !rawText.trim()) return [];

  // Split safely by any OS line ending
  const lines = rawText.split(/\r\n|\n|\r/);
  const blocks: DiffBlock[] = [];
  let index = 1;

  let state: "IDLE" | "SEARCH" | "REPLACE" = "IDLE";
  let currentSearch: string[] = [];
  let currentReplace: string[] = [];
  let currentFile = "Active File";

  console.log(`[Parser] Processing ${lines.length} lines...`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (state === "IDLE") {
      const fileMatch = trimmed.match(
        /^(?:FILE|OVERWRITE FILE|File|Path|###|\*\*)\s*:?\s*[`"']?([^`"']+\.[a-zA-Z0-9]+)[`"']?/i,
      );
      if (fileMatch) currentFile = fileMatch[1];

      // MOVE/RENAME directive — its own standalone line, no SEARCH/REPLACE
      // markers needed. Accepts "->", "→", or "to" as the separator. The
      // verb is captured in its own group so changeType can distinguish
      // MOVE from RENAME instead of collapsing both into one label.
      const moveMatch = trimmed.match(
        /^(MOVE|RENAME|Move|Rename)\s*:?\s*[`"']?([^`"'\n]+?)[`"']?\s*(?:->|→|to)\s*[`"']?([^`"'\n]+?)[`"']?$/i,
      );
      if (moveMatch) {
        console.log(
          `[Parser] 📦 Found MOVE directive: ${moveMatch[2]} -> ${moveMatch[3]}`,
        );
        const isRename = /^rename$/i.test(moveMatch[1]);
        blocks.push({
          id: String(index++),
          file: moveMatch[2].trim(),
          status: "match",
          search: "",
          replace: "",
          type: "move",
          changeType: isRename ? "RENAME" : "MOVE",
          moveTo: moveMatch[3].trim(),
        });
      }

      if (trimmed === "<<<<<<< SEARCH") {
        console.log(`[Parser] 🟢 Found SEARCH start at line ${i + 1}`);
        state = "SEARCH";
        currentSearch = [];
        currentReplace = [];
      }
    } else if (state === "SEARCH") {
      if (trimmed === "=======") {
        console.log(`[Parser] 🟡 Found DIVIDER at line ${i + 1}`);
        state = "REPLACE";
      } else {
        currentSearch.push(line);
      }
    } else if (state === "REPLACE") {
      if (trimmed === ">>>>>>> REPLACE") {
        console.log(
          `[Parser] 🔴 Found REPLACE end at line ${i + 1}. Pushing block!`,
        );

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

  console.log(
    `[Parser] Finished state machine. Found ${blocks.length} blocks.`,
  );

  // 2. FALLBACK FOR "Create 'file'" OVERWRITES
  const createRegex =
    /(?:Create|Overwriting|File:)[ \t]*['"]?([^'":\n]+?\.[a-zA-Z0-9]+)['"]?:?[ \t]*\n```[a-zA-Z]*\n([\s\S]*?)\n```/gi;
  let match;
  while ((match = createRegex.exec(rawText)) !== null) {
    const filePath = match[1].trim();
    const replaceContent = match[2];
    if (
      !blocks.some((b) => b.file === filePath && b.replace === replaceContent)
    ) {
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
export function parseFileList(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r\n|\n|\r/);
  const lineRegex = /^-\s*[`"']?([^\s`"']+\.[a-zA-Z0-9]+)[`"']?/;
  const files: string[] = [];

  for (const line of lines) {
    const match = line.trim().match(lineRegex);
    if (match) {
      const filePath = match[1].replace(/[,:]$/, "");
      if (!files.includes(filePath)) {
        files.push(filePath);
      }
    }
  }

  return files;
}
