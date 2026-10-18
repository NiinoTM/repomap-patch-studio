import { useEffect, useMemo } from "react";

interface TokenStats {
  total: number;
  map: number;
  files: number;
  selectedCount: number;
}

import { parseContextItem, ContextSelectionSet } from "../../../types/contextSelection";

interface UseTokenEstimateParams {
  repoMap: string;
  request: string;
  selectedFiles: Set<string> | ContextSelectionSet;
  fileStats?: Record<string, { size: number; tokens: number }>;
  onTokenStatsChange?: (stats: TokenStats) => void;
}

// Extracted from PromptPanel.tsx — pure token-count math that was sitting
// inline in the render component; reports upward via onTokenStatsChange.
export function useTokenEstimate({
  repoMap,
  request,
  selectedFiles,
  fileStats,
  onTokenStatsChange,
}: UseTokenEstimateParams) {
  const repoMapTokens = useMemo(
    () => Math.ceil((repoMap?.length || 0) / 3.8),
    [repoMap],
  );

  const selectedFilesTokens = useMemo(() => {
    let total = 0;
    const items =
      selectedFiles instanceof ContextSelectionSet
        ? selectedFiles.getItems()
        : Array.from(selectedFiles).map(
            (f) => parseContextItem(f) ?? { type: "file" as const, path: f },
          );

    for (const item of items) {
      const baseTokens = fileStats?.[item.path]?.tokens || 0;
      if (item.type === "file") {
        total += baseTokens;
      } else if (item.type === "range") {
        const lineCount = Math.max(1, item.end - item.start + 1);
        total += Math.min(baseTokens, Math.ceil(lineCount * 12));
      } else if (item.type === "symbol") {
        total += Math.min(baseTokens, 250);
      }
    }
    return total;
  }, [selectedFiles, fileStats]);

  const promptOverheadTokens = useMemo(
    () => Math.ceil((request.length + 800) / 3.8),
    [request],
  );

  const totalEstimatedTokens =
    repoMapTokens + selectedFilesTokens + promptOverheadTokens;

  useEffect(() => {
    if (onTokenStatsChange) {
      onTokenStatsChange({
        total: totalEstimatedTokens,
        map: repoMapTokens,
        files: selectedFilesTokens,
        selectedCount: selectedFiles.size,
      });
    }
  }, [
    totalEstimatedTokens,
    repoMapTokens,
    selectedFilesTokens,
    selectedFiles.size,
    onTokenStatsChange,
  ]);

  return { repoMapTokens, selectedFilesTokens, totalEstimatedTokens };
}
