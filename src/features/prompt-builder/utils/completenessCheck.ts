export interface MissingDependency {
  filePath: string;
  requiredBy: string[];
  kind: "import" | "api";
}

interface DependencyMapShape {
  outbound?: Record<string, string[]>;
  apiOutbound?: Record<string, string[]>;
}

/**
 * Detects files that are referenced (via import or API call) by the current
 * selection but are NOT themselves selected. This is a deterministic check —
 * unlike the suggestion bar, it is meant to run right before context is
 * copied, so nothing referenced by the sent code is silently missing.
 */
export function findMissingDependencies(
  selectedFiles: Set<string>,
  dependencyMap?: DependencyMapShape,
): MissingDependency[] {
  if (!dependencyMap) return [];

  const outboundMap = dependencyMap.outbound || {};
  const apiOutboundMap = dependencyMap.apiOutbound || {};

  const missingByFile = new Map<string, MissingDependency>();

  const recordEdge = (
    target: string,
    source: string,
    kind: "import" | "api",
  ) => {
    if (selectedFiles.has(target)) return;
    const existing = missingByFile.get(target);
    if (existing) {
      if (!existing.requiredBy.includes(source)) {
        existing.requiredBy.push(source);
      }
    } else {
      missingByFile.set(target, {
        filePath: target,
        requiredBy: [source],
        kind,
      });
    }
  };

  selectedFiles.forEach((file) => {
    (outboundMap[file] || []).forEach((target) =>
      recordEdge(target, file, "import"),
    );
    (apiOutboundMap[file] || []).forEach((target) =>
      recordEdge(target, file, "api"),
    );
  });

  return Array.from(missingByFile.values()).sort((a, b) =>
    a.filePath.localeCompare(b.filePath),
  );
}
