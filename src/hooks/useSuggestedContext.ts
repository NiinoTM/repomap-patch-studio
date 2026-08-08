import { useMemo } from "react";
import { SuggestedFile } from "../components/prompt/SuggestedContextBar";

interface UseSuggestedContextProps {
  seedFiles: Set<string>;
  selectedFiles: Set<string>;
  dependencyMap?: {
    outbound: Record<string, string[]>;
    inbound: Record<string, string[]>;
    apiOutbound?: Record<string, string[]>;
    apiInbound?: Record<string, string[]>;
  };
}

export function useSuggestedContext({
  seedFiles,
  selectedFiles,
  dependencyMap,
}: UseSuggestedContextProps): SuggestedFile[] {
  return useMemo(() => {
    if (
      !dependencyMap ||
      (!dependencyMap.outbound &&
        !dependencyMap.inbound &&
        !dependencyMap.apiOutbound &&
        !dependencyMap.apiInbound) ||
      seedFiles.size === 0
    ) {
      return [];
    }

    const outboundMap = dependencyMap.outbound || {};
    const inboundMap = dependencyMap.inbound || {};
    const apiOutboundMap = dependencyMap.apiOutbound || {};
    const apiInboundMap = dependencyMap.apiInbound || {};

    const candidates = new Set<string>();

    seedFiles.forEach((file) => {
      const children = outboundMap[file] || [];
      children.forEach((child) => {
        if (!selectedFiles.has(child)) candidates.add(child);
      });

      const parents = inboundMap[file] || [];
      parents.forEach((parent) => {
        if (!selectedFiles.has(parent)) candidates.add(parent);
      });

      const apiTargets = apiOutboundMap[file] || [];
      apiTargets.forEach((apiTarget) => {
        if (!selectedFiles.has(apiTarget)) candidates.add(apiTarget);
      });

      const apiCallers = apiInboundMap[file] || [];
      apiCallers.forEach((apiCaller) => {
        if (!selectedFiles.has(apiCaller)) candidates.add(apiCaller);
      });
    });

    const results: SuggestedFile[] = [];

    candidates.forEach((candPath) => {
      const candOutbound = outboundMap[candPath] || [];
      const candInbound = inboundMap[candPath] || [];
      const candApiOutbound = apiOutboundMap[candPath] || [];
      const candApiInbound = apiInboundMap[candPath] || [];

      const isApiHandler = candApiInbound.some((f) => seedFiles.has(f));
      const isApiClient = candApiOutbound.some((f) => seedFiles.has(f));

      if (isApiHandler || isApiClient) {
        const seedNames =
          seedFiles.size > 0
            ? Array.from(seedFiles)
                .map((f) => f.split("/").pop() || f)
                .join(", ")
            : "";
        results.push({
          filePath: candPath,
          type: "api",
          importedActiveFiles: [],
          importingActiveFiles: [],
          tooltip: `API Endpoint Link: Handles network calls for ${seedNames}`,
        });
        return;
      }

      const importedSeed = candOutbound.filter((f) => seedFiles.has(f));
      const importingSeed = candInbound.filter((f) => seedFiles.has(f));

      const isParent = importedSeed.length > 0;
      const isChild = importingSeed.length > 0;

      let type: "parent" | "child" | "hub" = "child";
      let tooltip = "";

      if (isParent && isChild) {
        type = "hub";
        tooltip = "Hub: Both a parent and child across active context";
      } else if (isParent) {
        type = "parent";
        const fileNames = importedSeed
          .map((f) => f.split("/").pop() || f)
          .join(", ");
        tooltip = `Parent: Imports ${fileNames}`;
      } else {
        type = "child";
        const fileNames = importingSeed
          .map((f) => f.split("/").pop() || f)
          .join(", ");
        tooltip = `Child: Imported by ${fileNames}`;
      }

      results.push({
        filePath: candPath,
        type,
        importedActiveFiles: importedSeed,
        importingActiveFiles: importingSeed,
        tooltip,
      });
    });

    return results;
  }, [seedFiles, selectedFiles, dependencyMap]);
}