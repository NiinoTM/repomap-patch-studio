import { FeatureBlueprintDomain, ProposedFileMove } from "../../../types/remediation";

interface DependencyGraph {
  outbound: Record<string, string[]>;
  inbound: Record<string, string[]>;
}

const COMMON_STRIP_REGEX = /(?:Card|Modal|Dialog|Panel|Widget|View|Button|Table|Parser|Helper|Client|Service|Api|use)$/i;

function cleanDomainStem(rawName: string): string {
  let stem = rawName.replace(/\.[^.]+$/, "");
  stem = stem.replace(/^use([A-Z])/, "$1");
  stem = stem.replace(COMMON_STRIP_REGEX, "").toLowerCase();
  return stem.length >= 3 ? stem : "shared";
}

function isFlatFileCandidate(file: string): boolean {
  if (file.startsWith("src/features/")) return false;
  if (file === "src/main.tsx" || file === "src/App.tsx" || file === "src/index.css") return false;
  return (
    file.startsWith("src/components/") ||
    file.startsWith("src/hooks/") ||
    file.startsWith("src/utils/") ||
    file.startsWith("src/services/")
  );
}

function determineTargetSubdir(file: string): string {
  if (file.includes("/components/")) return "components";
  if (file.includes("/hooks/") || file.match(/\/use[A-Z]/)) return "hooks";
  if (file.includes("/services/") || file.includes("/api/")) return "api";
  return "utils";
}

function buildProposedMove(file: string, domain: string, inboundCount: number, index: number): ProposedFileMove {
  const fileName = file.split("/").pop() || file;
  const subdir = determineTargetSubdir(file);
  const targetPath = `src/features/${domain}/${subdir}/${fileName}`;

  return {
    id: `move-${domain}-${index}-${fileName.replace(/[^a-zA-Z0-9]/g, "-")}`,
    sourcePath: file,
    targetPath,
    targetFeature: domain,
    reason: `Cluster '${fileName}' into cohesive domain 'src/features/${domain}'`,
    dependentFilesCount: inboundCount,
    status: "pending",
  };
}

export function clusterDomains(files: string[], dependencyMap: DependencyGraph): FeatureBlueprintDomain[] {
  const clusters: Record<string, string[]> = {};

  for (const file of files) {
    if (!isFlatFileCandidate(file)) continue;
    const fileName = file.split("/").pop() || "";
    const stem = cleanDomainStem(fileName);
    if (!clusters[stem]) clusters[stem] = [];
    clusters[stem].push(file);
  }

  const blueprintDomains: FeatureBlueprintDomain[] = [];
  for (const domain in clusters) {
    const domainFiles = clusters[domain];
    const moves: ProposedFileMove[] = domainFiles.map((f, idx) => {
      const inboundCount = dependencyMap.inbound[f]?.length || 0;
      return buildProposedMove(f, domain, inboundCount, idx);
    });

    const capitalized = domain.charAt(0).toUpperCase() + domain.slice(1);
    blueprintDomains.push({
      name: `${capitalized} Domain`,
      description: `Encapsulate ${domain} components, hooks, and utilities into an isolated feature slice`,
      proposedPath: `src/features/${domain}`,
      filesToMove: moves,
    });
  }

  return blueprintDomains;
}