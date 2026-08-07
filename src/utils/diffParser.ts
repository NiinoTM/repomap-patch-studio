import { DiffBlock } from "../types";

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
      });
    }
  }

  console.log(`[Parser] Final returned blocks:`, blocks);
  return blocks;
}
