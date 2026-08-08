import { useEffect, useMemo } from "react";

interface TokenStats {
  total: number;
  map: number;
  files: number;
  selectedCount: number;
}

interface UseTokenEstimateParams {
  repoMap: string;
  request: string;
  selectedFiles: Set<string>;
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
    selectedFiles.forEach((file) => {
      total += fileStats?.[file]?.tokens || 0;
    });
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
