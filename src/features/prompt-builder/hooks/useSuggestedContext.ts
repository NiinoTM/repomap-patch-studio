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

const MAX_DEPTH = 2; // Configurable depth for multi-hop traversal

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

    const candidateDistances = new Map<string, number>();
    const visited = new Set<string>(selectedFiles);
    const queue: { path: string; depth: number }[] = [];

    // Initialize queue with all selected files at depth 0.
    // This makes accepted suggestions act as new seeds automatically.
    selectedFiles.forEach((file) => {
      queue.push({ path: file, depth: 0 });
    });

    while (queue.length > 0) {
      const { path: currentFile, depth } = queue.shift()!;

      if (depth >= MAX_DEPTH) continue;

      const nextDepth = depth + 1;
      const neighbors = new Set([
        ...(outboundMap[currentFile] || []),
        ...(inboundMap[currentFile] || []),
        ...(apiOutboundMap[currentFile] || []),
        ...(apiInboundMap[currentFile] || []),
      ]);

      neighbors.forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          candidateDistances.set(neighbor, nextDepth);
          queue.push({ path: neighbor, depth: nextDepth });
        }
      });
    }

    const results: SuggestedFile[] = [];

    candidateDistances.forEach((distance, candPath) => {
      const candOutbound = outboundMap[candPath] || [];
      const candInbound = inboundMap[candPath] || [];
      const candApiOutbound = apiOutboundMap[candPath] || [];
      const candApiInbound = apiInboundMap[candPath] || [];

      // Determine relationship relative to nodes strictly closer to the seeds
      const isCloser = (f: string) =>
        selectedFiles.has(f) ||
        (candidateDistances.get(f) ?? Infinity) < distance;

      const closerApiInbound = candApiInbound.filter(isCloser);
      const closerApiOutbound = candApiOutbound.filter(isCloser);

      if (closerApiInbound.length > 0 || closerApiOutbound.length > 0) {
        const relNames = [...closerApiInbound, ...closerApiOutbound]
          .map((f) => f.split("/").pop() || f)
          .join(", ");
        results.push({
          filePath: candPath,
          type: "api",
          distance,
          importedActiveFiles: [],
          importingActiveFiles: [],
          tooltip: `[${distance} hop${distance > 1 ? "s" : ""}] API Endpoint Link: Handles network calls for ${relNames}`,
        });
        return;
      }

      const importedByCloser = candInbound.filter(isCloser);
      const importsCloser = candOutbound.filter(isCloser);

      const isParent = importsCloser.length > 0;
      const isChild = importedByCloser.length > 0;

      let type: "parent" | "child" | "hub";
      let tooltip: string;

      if (isParent && isChild) {
        type = "hub";
        tooltip = `[${distance} hop${distance > 1 ? "s" : ""}] Hub: Both a parent and child to active context`;
      } else if (isParent) {
        type = "parent";
        const fileNames = importsCloser
          .map((f) => f.split("/").pop() || f)
          .join(", ");
        tooltip = `[${distance} hop${distance > 1 ? "s" : ""}] Parent: Imports ${fileNames}`;
      } else {
        type = "child";
        const fileNames = importedByCloser
          .map((f) => f.split("/").pop() || f)
          .join(", ");
        tooltip = `[${distance} hop${distance > 1 ? "s" : ""}] Child: Imported by ${fileNames}`;
      }

      results.push({
        filePath: candPath,
        type,
        distance,
        importedActiveFiles: importsCloser,
        importingActiveFiles: importedByCloser,
        tooltip,
      });
    });

    return results.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.filePath.localeCompare(b.filePath);
    });
  }, [seedFiles, selectedFiles, dependencyMap]);
}
