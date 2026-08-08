import fs from "fs";
import path from "path";

export interface DependencyMap {
  outbound: Record<string, string[]>;
  inbound: Record<string, string[]>;
  apiOutbound: Record<string, string[]>;
  apiInbound: Record<string, string[]>;
}

/**
 * Generates inbound, outbound, and API dependency maps for repository files.
 */
export function getDependencyMap(basePath: string, filesList: string[]): DependencyMap {
  const outbound: Record<string, string[]> = {};
  const inboundMap: Record<string, Set<string>> = {};
  const apiOutbound: Record<string, string[]> = {};
  const apiInboundMap: Record<string, Set<string>> = {};
  const fileSet = new Set(filesList);

  for (const file of filesList) {
    const ext = path.extname(file).toLowerCase();
    if (![".js", ".jsx", ".ts", ".tsx"].includes(ext)) continue;

    try {
      const fullPath = path.join(basePath, file);
      const content = fs.readFileSync(fullPath, "utf-8");
      const imports = new Set<string>();

      const importRegex =
        /(?:import|export)\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g;
      let match: RegExpExecArray | null;

      while ((match = importRegex.exec(content)) !== null) {
        let importPath = match[1] || match[2];
        if (!importPath) continue;

        if (importPath.startsWith("@/")) {
          importPath = "./" + importPath.slice(2);
        }

        if (importPath.startsWith(".")) {
          const fileDir = path.dirname(file);
          const rawResolved = path
            .normalize(path.join(fileDir, importPath))
            .replace(/\\/g, "/");

          const candidates = [
            rawResolved,
            `${rawResolved}.tsx`,
            `${rawResolved}.ts`,
            `${rawResolved}.jsx`,
            `${rawResolved}.js`,
            `${rawResolved}/index.tsx`,
            `${rawResolved}/index.ts`,
            `${rawResolved}/index.jsx`,
            `${rawResolved}/index.js`,
          ];

          for (const cand of candidates) {
            if (fileSet.has(cand) && cand !== file) {
              imports.add(cand);
              break;
            }
          }
        }
      }

      if (imports.size > 0) {
        outbound[file] = Array.from(imports);
        for (const imp of imports) {
          if (!inboundMap[imp]) inboundMap[imp] = new Set();
          inboundMap[imp].add(file);
        }
      }
    } catch (e) {}
  }

  const routeHandlers: Record<string, Set<string>> = {};

  const apiRouteHandlerRegex =
    /(?:app|router|server)\s*\.\s*(?:get|post|put|delete|patch|all|use)\s*\(\s*[`'"]([^`'"]+)[`'"]/gi;

  for (const file of filesList) {
    const ext = path.extname(file).toLowerCase();
    if (![".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs"].includes(ext)) continue;

    try {
      const fullPath = path.join(basePath, file);
      const content = fs.readFileSync(fullPath, "utf-8");
      let match: RegExpExecArray | null;
      while ((match = apiRouteHandlerRegex.exec(content)) !== null) {
        const route = match[1];
        if (route.startsWith("/api") || route.startsWith("/")) {
          if (!routeHandlers[route]) routeHandlers[route] = new Set();
          routeHandlers[route].add(file);
        }
      }
    } catch (e) {}
  }

  const apiClientRegex =
    /(?:fetch|axios\.(?:get|post|put|delete|patch)|apiCall)\s*\(\s*[`'"]([^`'"${}\n]+)[`'"]/gi;

  for (const file of filesList) {
    const ext = path.extname(file).toLowerCase();
    if (![".js", ".jsx", ".ts", ".tsx"].includes(ext)) continue;

    try {
      const fullPath = path.join(basePath, file);
      const content = fs.readFileSync(fullPath, "utf-8");
      let match: RegExpExecArray | null;
      while ((match = apiClientRegex.exec(content)) !== null) {
        const rawRoute = match[1];
        const cleanRoute = rawRoute.split("?")[0].split("#")[0];

        if (routeHandlers[cleanRoute]) {
          for (const backendFile of routeHandlers[cleanRoute]) {
            if (backendFile !== file) {
              if (!apiOutbound[file]) apiOutbound[file] = [];
              if (!apiOutbound[file].includes(backendFile)) {
                apiOutbound[file].push(backendFile);
              }

              if (!apiInboundMap[backendFile])
                apiInboundMap[backendFile] = new Set();
              apiInboundMap[backendFile].add(file);
            }
          }
        }
      }
    } catch (e) {}
  }

  const inbound: Record<string, string[]> = {};
  for (const key in inboundMap) {
    inbound[key] = Array.from(inboundMap[key]);
  }

  const apiInbound: Record<string, string[]> = {};
  for (const key in apiInboundMap) {
    apiInbound[key] = Array.from(apiInboundMap[key]);
  }

  return { outbound, inbound, apiOutbound, apiInbound };
}