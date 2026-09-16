export interface BoundaryViolation {
  id: string;
  file: string;
  target?: string;
  rule: string;
  message: string;
  severity: "error" | "warn";
}

interface ScanContext {
  files: string[];
  dependencyMap: {
    outbound: Record<string, string[]>;
    inbound: Record<string, string[]>;
    apiOutbound?: Record<string, string[]>;
    apiInbound?: Record<string, string[]>;
  };
  fileStats?: Record<string, { size: number; tokens: number }>;
}

function checkSizeViolations(
  files: string[],
  fileStats: Record<string, { size: number; tokens: number }> = {},
): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];
  for (const file of files) {
    const stat = fileStats[file];
    if (!stat) continue;

    const isTsx = file.endsWith(".tsx");
    const maxTokens = isTsx ? 3500 : 2500;
    if (stat.tokens > maxTokens) {
      violations.push({
        id: `size-${file}`,
        file,
        rule: "max-lines",
        message: `File exceeds recommended budget (~${stat.tokens} tokens). Candidate for modular extraction.`,
        severity: "warn",
      });
    }
  }
  return violations;
}

function checkFrontendLayerViolation(source: string, target: string): BoundaryViolation | null {
  const isComponent = source.includes("/components/") || source.startsWith("src/components/");
  const isApiTarget = target.startsWith("src/api") || target.includes("/api/");

  if (isComponent && isApiTarget) {
    return {
      id: `layer-${source}-${target}`,
      file: source,
      target,
      rule: "no-fetch-in-components",
      message: `UI Component imports API client (${target}) directly instead of delegating to a custom hook.`,
      severity: "error",
    };
  }
  return null;
}

function checkBackendLayerViolation(source: string, target: string): BoundaryViolation | null {
  if (source.startsWith("server/routes") && target.startsWith("server/adapters")) {
    return {
      id: `layer-${source}-${target}`,
      file: source,
      target,
      rule: "controllers-no-db-access",
      message: `Controller/Route imports Adapter (${target}) directly instead of delegating to a Service.`,
      severity: "error",
    };
  }

  const isHigherLayer = target.startsWith("server/services") || target.startsWith("server/routes");
  if (source.startsWith("server/adapters") && isHigherLayer) {
    return {
      id: `layer-${source}-${target}`,
      file: source,
      target,
      rule: "adapters-cannot-import-services",
      message: `Adapter imports higher-layer Service/Route (${target}). Adapters must be pure leaves.`,
      severity: "error",
    };
  }

  return null;
}

function checkLayerViolations(source: string, targets: string[]): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];
  for (const target of targets) {
    const feViolation = checkFrontendLayerViolation(source, target);
    if (feViolation) violations.push(feViolation);

    const beViolation = checkBackendLayerViolation(source, target);
    if (beViolation) violations.push(beViolation);
  }
  return violations;
}

function checkPublicApiBarrier(source: string, targets: string[]): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];
  const sourceMatch = source.match(/^src\/features\/([^/]+)\//);
  if (!sourceMatch) return violations;

  const sourceDomain = sourceMatch[1];
  for (const target of targets) {
    const targetMatch = target.match(/^src\/features\/([^/]+)\//);
    if (!targetMatch) continue;

    const targetDomain = targetMatch[1];
    if (sourceDomain !== targetDomain && !target.endsWith("/index.ts") && !target.endsWith("/index.tsx")) {
      violations.push({
        id: `barrier-${source}-${target}`,
        file: source,
        target,
        rule: "feature-public-api-barrier",
        message: `Cross-feature internal import from '${targetDomain}'. Access must pass through '${targetDomain}/index.ts'.`,
        severity: "error",
      });
    }
  }

  return violations;
}

export function scanBoundaryViolations(context: ScanContext): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];
  const { files, dependencyMap, fileStats = {} } = context;

  violations.push(...checkSizeViolations(files, fileStats));

  for (const file of files) {
    const targets = dependencyMap.outbound[file] || [];
    violations.push(...checkLayerViolations(file, targets));
    violations.push(...checkPublicApiBarrier(file, targets));
  }

  return violations;
}