import { useCallback } from "react";
import { DiffBlock } from "../../../types/patch";
import { parseDiffBlocks } from "../utils/diffParser";
import { validateBlocks } from "../utils/blockMatcher";
import { filesApi } from "../../../api/repoApi";

interface UsePasteAndValidateParams {
  pastedContent: string;
  setPastedContent: (value: string) => void;
  setDiffBlocks: (blocks: DiffBlock[]) => void;
  setIgnoredBlockIds: (ids: Set<string>) => void;
  setToastMessage: (message: string | null) => void;
}

/**
 * Reads the clipboard, parses it into diff blocks, fetches the referenced
 * files, and validates each block against current file contents. All
 * network I/O and orchestration lives here — components stay
 * presentation-only.
 */
export function usePasteAndValidate({
  pastedContent,
  setPastedContent,
  setDiffBlocks,
  setIgnoredBlockIds,
  setToastMessage,
}: UsePasteAndValidateParams) {
  const handlePaste = useCallback(
    async (append = false) => {
      try {
        const clipboardText = await navigator.clipboard.readText();
        if (!clipboardText) return;

        const newContent =
          append && pastedContent
            ? pastedContent + "\n\n" + clipboardText
            : clipboardText;
        setPastedContent(newContent);
        if (!append) {
          setIgnoredBlockIds(new Set());
        }

        const parsed = parseDiffBlocks(newContent);
        if (parsed.length === 0) {
          setDiffBlocks([]);
          return;
        }

        const uniqueFiles = Array.from(
          new Set(
            parsed.map((b) => b.file).filter((f) => f !== "Active File"),
          ),
        );

        let data = { success: false, contents: {} as Record<string, string> };
        if (uniqueFiles.length > 0) {
          data = await filesApi.fetchFiles(uniqueFiles);
        } else {
          data.success = true;
        }

        setDiffBlocks(
          data.success ? validateBlocks(parsed, data.contents) : parsed,
        );
      } catch (err) {
        console.error("Failed to parse pasted text: ", err);
        setToastMessage("Error parsing clipboard text.");
      }
    },
    [
      pastedContent,
      setPastedContent,
      setDiffBlocks,
      setIgnoredBlockIds,
      setToastMessage,
    ],
  );

  return { handlePaste };
}
