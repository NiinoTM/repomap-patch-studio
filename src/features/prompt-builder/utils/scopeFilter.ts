export function extractAvailableScopes(files: string[] = []): string[] {
  const scopes = new Set<string>();

  for (const f of files) {
    const normalized = f.replace(/\\/g, "/");

    // 1. Feature folders: src/features/<feature>
    const featureMatch = normalized.match(/^src\/features\/([^/]+)/);
    if (featureMatch) {
      scopes.add(featureMatch[1]);
      continue;
    }

    // 2. Common architectural subdirectories: src/<domain>, server/<domain>
    const subMatch = normalized.match(/^(?:src|server)\/([^/]+)/);
    if (subMatch) {
      scopes.add(subMatch[1]);
      continue;
    }

    // 3. Any top-level directory in the repo (e.g. caddy, development_folder, etc.)
    const topMatch = normalized.match(/^([^/]+)\//);
    if (
      topMatch &&
      !topMatch[1].startsWith(".") &&
      topMatch[1] !== "node_modules" &&
      topMatch[1] !== "dist" &&
      topMatch[1] !== "build"
    ) {
      scopes.add(topMatch[1]);
    }
  }

  return Array.from(scopes).filter((s) => s.length > 1).sort();
}

export function fileMatchesScope(filePath: string, scope: string): boolean {
  if (!scope || scope === "all") return true;
  const p = filePath.replace(/\\/g, "/");

  if (p.startsWith(`src/features/${scope}/`) || p === `src/features/${scope}`) return true;
  if (p.startsWith(`${scope}/`) || p.includes(`/${scope}/`)) return true;

  return p.startsWith(scope);
}

export function filterRepoMapByScope(rawMap: string, scope: string): string {
  if (!rawMap || !scope || scope === "all") return rawMap;

  const lines = rawMap.split("\n");
  const filteredLines: string[] = [];
  let includeCurrentFile = false;

  for (const line of lines) {
    if (line.startsWith("│") || line.startsWith(" ")) {
      if (includeCurrentFile) {
        filteredLines.push(line);
      }
    } else {
      const trimmed = line.trim();
      if (!trimmed) {
        if (includeCurrentFile) filteredLines.push(line);
        continue;
      }
      const filePath = trimmed.replace(/:$/, "");
      includeCurrentFile = fileMatchesScope(filePath, scope);
      if (includeCurrentFile) {
        filteredLines.push(line);
      }
    }
  }

  const result = filteredLines.join("\n").trim();
  return result || `(No files found in active scope "${scope}")`;
}