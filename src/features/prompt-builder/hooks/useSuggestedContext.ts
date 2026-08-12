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

function hasDependencies(
  dependencyMap?: UseSuggestedContextProps["dependencyMap"],
): boolean {
  if (!dependencyMap) return false;
  return Boolean(
    dependencyMap.outbound ||
    dependencyMap.inbound ||
    dependencyMap.apiOutbound ||
    dependencyMap.apiInbound,
  );
}

function traverseCandidates(
  selectedFiles: Set<string>,
  dependencyMap: NonNullable<UseSuggestedContextProps["dependencyMap"]>,
): Map<string, number> {
  const candidateDistances = new Map<string, number>();
  const visited = new Set<string>(selectedFiles);
  const queue: { path: string; depth: number }[] = [];

  selectedFiles.forEach((file) => {
    queue.push({ path: file, depth: 0 });
  });

  const outboundMap = dependencyMap.outbound || {};
  const inboundMap = dependencyMap.inbound || {};
  const apiOutboundMap = dependencyMap.apiOutbound || {};
  const apiInboundMap = dependencyMap.apiInbound || {};

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

  return candidateDistances;
}

function getHopSuffix(distance: number): string {
  return distance > 1 ? "s" : "";
}

function formatFileNames(files: string[]): string {
  return files.map((f) => f.split("/").pop() || f).join(", ");
}

function tryBuildApiSuggestedFile(
  candPath: string,
  distance: number,
  candApiInbound: string[],
  candApiOutbound: string[],
  isCloser: (f: string) => boolean,
): SuggestedFile | null {
  const closerApiInbound = candApiInbound.filter(isCloser);
  const closerApiOutbound = candApiOutbound.filter(isCloser);

  if (closerApiInbound.length === 0 && closerApiOutbound.length === 0) {
    return null;
  }

  const relNames = formatFileNames([...closerApiInbound, ...closerApiOutbound]);
  return {
    filePath: candPath,
    type: "api",
    distance,
    importedActiveFiles: [],
    importingActiveFiles: [],
    tooltip: `[${distance} hop${getHopSuffix(distance)}] API Endpoint Link: Handles network calls for ${relNames}`,
  };
}

function buildImportSuggestedFile(
  candPath: string,
  distance: number,
  importsCloser: string[],
  importedByCloser: string[],
): SuggestedFile {
  const isParent = importsCloser.length > 0;
  const isChild = importedByCloser.length > 0;
  const hop = getHopSuffix(distance);

  if (isParent && isChild) {
    return {
      filePath: candPath,
      type: "hub",
      distance,
      importedActiveFiles: importsCloser,
      importingActiveFiles: importedByCloser,
      tooltip: `[${distance} hop${hop}] Hub: Both a parent and child to active context`,
    };
  }

  if (isParent) {
    const fileNames = formatFileNames(importsCloser);
    return {
      filePath: candPath,
      type: "parent",
      distance,
      importedActiveFiles: importsCloser,
      importingActiveFiles: importedByCloser,
      tooltip: `[${distance} hop${hop}] Parent: Imports ${fileNames}`,
    };
  }

  const fileNames = formatFileNames(importedByCloser);
  return {
    filePath: candPath,
    type: "child",
    distance,
    importedActiveFiles: importsCloser,
    importingActiveFiles: importedByCloser,
    tooltip: `[${distance} hop${hop}] Child: Imported by ${fileNames}`,
  };
}

function buildSuggestedFile(
  candPath: string,
  distance: number,
  selectedFiles: Set<string>,
  candidateDistances: Map<string, number>,
  dependencyMap: NonNullable<UseSuggestedContextProps["dependencyMap"]>,
): SuggestedFile {
  const isCloser = (f: string) =>
    selectedFiles.has(f) || (candidateDistances.get(f) ?? Infinity) < distance;

  const apiFile = tryBuildApiSuggestedFile(
    candPath,
    distance,
    dependencyMap.apiInbound?.[candPath] || [],
    dependencyMap.apiOutbound?.[candPath] || [],
    isCloser,
  );
  if (apiFile) return apiFile;

  const candInbound = dependencyMap.inbound?.[candPath] || [];
  const candOutbound = dependencyMap.outbound?.[candPath] || [];

  const importedByCloser = candInbound.filter(isCloser);
  const importsCloser = candOutbound.filter(isCloser);

  return buildImportSuggestedFile(
    candPath,
    distance,
    importsCloser,
    importedByCloser,
  );
}

export function useSuggestedContext({
  seedFiles,
  selectedFiles,
  dependencyMap,
}: UseSuggestedContextProps): SuggestedFile[] {
  return useMemo(() => {
    if (!hasDependencies(dependencyMap) || seedFiles.size === 0) {
      return [];
    }

    const safeMap = dependencyMap!;
    const candidateDistances = traverseCandidates(selectedFiles, safeMap);

    const results: SuggestedFile[] = [];
    candidateDistances.forEach((distance, candPath) => {
      results.push(
        buildSuggestedFile(
          candPath,
          distance,
          selectedFiles,
          candidateDistances,
          safeMap,
        ),
      );
    });

    return results.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.filePath.localeCompare(b.filePath);
    });
  }, [seedFiles, selectedFiles, dependencyMap]);
}
