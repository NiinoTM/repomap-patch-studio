import {
  readTextFile,
  joinPath,
  dirnamePath,
  extnamePath,
  normalizePath,
} from "../adapters/fsAdapter";

export interface DependencyMap {
  outbound: Record<string, string[]>;
  inbound: Record<string, string[]>;
  apiOutbound: Record<string, string[]>;
  apiInbound: Record<string, string[]>;
}

const CODE_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

function toArrayMap(
  setMap: Record<string, Set<string>>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const key in setMap) {
    result[key] = Array.from(setMap[key]);
  }
  return result;
}

function resolveLocalImportCandidates(
  fileDir: string,
  importPath: string,
): string[] {
  let basePaths: string[];

  if (importPath.startsWith("@/") || importPath.startsWith("~/")) {
    const cleanPath = importPath.slice(2);
    basePaths = [
      normalizePath(cleanPath).replace(/\\/g, "/"),
      normalizePath(joinPath("src", cleanPath)).replace(/\\/g, "/"),
    ];
  } else if (importPath.startsWith(".")) {
    basePaths = [
      normalizePath(joinPath(fileDir, importPath)).replace(/\\/g, "/"),
    ];
  } else {
    return [];
  }

  const candidates: string[] = [];
  for (const rawResolved of basePaths) {
    candidates.push(
      rawResolved,
      `${rawResolved}.tsx`,
      `${rawResolved}.ts`,
      `${rawResolved}.jsx`,
      `${rawResolved}.js`,
      `${rawResolved}/index.tsx`,
      `${rawResolved}/index.ts`,
      `${rawResolved}/index.jsx`,
      `${rawResolved}/index.js`,
    );
  }
  return candidates;
}

function extractLocalImportsFromFile(
  basePath: string,
  file: string,
  fileSet: Set<string>,
): Set<string> {
  const imports = new Set<string>();
  const importRegex =
    /(?:import|export)\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)|import\(['"]([^'"]+)['"]\)/g;

  try {
    const content = readTextFile(joinPath(basePath, file));
    let match: RegExpExecArray | null;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1] || match[2] || match[3];
      if (!importPath) continue;

      const candidates = resolveLocalImportCandidates(
        dirnamePath(file),
        importPath,
      );
      for (const cand of candidates) {
        if (fileSet.has(cand) && cand !== file) {
          imports.add(cand);
          break;
        }
      }
        }
  } catch {
    // unreadable or unparsable file — skip it
    return imports;
  }

  return imports;
}

function recordImportEdges(
  outbound: Record<string, string[]>,
  inboundMap: Record<string, Set<string>>,
  file: string,
  imports: Set<string>,
): void {
  if (imports.size === 0) return;
  outbound[file] = Array.from(imports);
  for (const imp of imports) {
    if (!inboundMap[imp]) inboundMap[imp] = new Set();
    inboundMap[imp].add(file);
  }
}

function buildLocalImportGraph(
  basePath: string,
  filesList: string[],
): {
  outbound: Record<string, string[]>;
  inboundMap: Record<string, Set<string>>;
} {
  const outbound: Record<string, string[]> = {};
  const inboundMap: Record<string, Set<string>> = {};
  const fileSet = new Set(filesList);

  for (const file of filesList) {
    if (!CODE_EXTENSIONS.includes(extnamePath(file).toLowerCase())) continue;
    const imports = extractLocalImportsFromFile(basePath, file, fileSet);
    recordImportEdges(outbound, inboundMap, file, imports);
  }

  return { outbound, inboundMap };
}

function collectApiRouteHandlers(
  basePath: string,
  filesList: string[],
): Record<string, Set<string>> {
  const routeHandlers: Record<string, Set<string>> = {};
  const apiRouteHandlerRegex =
    /(?:app|router|server)\s*\.\s*(?:get|post|put|delete|patch|all|use)\s*\(\s*[`'"]([^`'"]+)[`'"]/gi;
  const routeFileExtensions = [...CODE_EXTENSIONS, ".mjs", ".cjs"];

  for (const file of filesList) {
    if (!routeFileExtensions.includes(extnamePath(file).toLowerCase()))
      continue;

    try {
      const content = readTextFile(joinPath(basePath, file));
      let match: RegExpExecArray | null;
      while ((match = apiRouteHandlerRegex.exec(content)) !== null) {
        const route = match[1];
        if (route.startsWith("/api") || route.startsWith("/")) {
          if (!routeHandlers[route]) routeHandlers[route] = new Set();
          routeHandlers[route].add(file);
        }
      }
    } catch {
      // unreadable or unparsable file — skip it
      continue;
    }
  }

  return routeHandlers;
}

function recordApiCallEdge(
  apiOutbound: Record<string, string[]>,
  apiInboundMap: Record<string, Set<string>>,
  file: string,
  backendFile: string,
): void {
  if (backendFile === file) return;
  if (!apiOutbound[file]) apiOutbound[file] = [];
  if (!apiOutbound[file].includes(backendFile))
    apiOutbound[file].push(backendFile);

  if (!apiInboundMap[backendFile]) apiInboundMap[backendFile] = new Set();
  apiInboundMap[backendFile].add(file);
}

function extractApiCallEdgesFromFile(
  basePath: string,
  file: string,
  routeHandlers: Record<string, Set<string>>,
  apiOutbound: Record<string, string[]>,
  apiInboundMap: Record<string, Set<string>>,
): void {
  const apiClientRegex =
    /(?:fetch|axios\.(?:get|post|put|delete|patch)|apiCall)\s*\(\s*[`'"]([^`'"${}\n]+)[`'"]/gi;

  try {
    const content = readTextFile(joinPath(basePath, file));
    let match: RegExpExecArray | null;
    while ((match = apiClientRegex.exec(content)) !== null) {
      const cleanRoute = match[1].split("?")[0].split("#")[0];
      const backendFiles = routeHandlers[cleanRoute];
      if (!backendFiles) continue;

      for (const backendFile of backendFiles) {
        recordApiCallEdge(apiOutbound, apiInboundMap, file, backendFile);
      }
    }
  } catch {
    // unreadable or unparsable file — skip it
    return;
  }
}

function resolveApiCallGraph(
  basePath: string,
  filesList: string[],
  routeHandlers: Record<string, Set<string>>,
): {
  apiOutbound: Record<string, string[]>;
  apiInboundMap: Record<string, Set<string>>;
} {
  const apiOutbound: Record<string, string[]> = {};
  const apiInboundMap: Record<string, Set<string>> = {};

  for (const file of filesList) {
    if (!CODE_EXTENSIONS.includes(extnamePath(file).toLowerCase())) continue;
    extractApiCallEdgesFromFile(
      basePath,
      file,
      routeHandlers,
      apiOutbound,
      apiInboundMap,
    );
  }

  return { apiOutbound, apiInboundMap };
}

export function getDependencyMap(
  basePath: string,
  filesList: string[],
): DependencyMap {
  const { outbound, inboundMap } = buildLocalImportGraph(basePath, filesList);
  const routeHandlers = collectApiRouteHandlers(basePath, filesList);
  const { apiOutbound, apiInboundMap } = resolveApiCallGraph(
    basePath,
    filesList,
    routeHandlers,
  );

  return {
    outbound,
    inbound: toArrayMap(inboundMap),
    apiOutbound,
    apiInbound: toArrayMap(apiInboundMap),
  };
}
