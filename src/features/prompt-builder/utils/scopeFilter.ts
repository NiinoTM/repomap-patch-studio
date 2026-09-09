export function fileMatchesScope(filePath: string, scope: string): boolean {
  if (!scope || scope === "all") return true;
  const p = filePath.replace(/\\/g, "/");

  if (scope === "server") return p.startsWith("server/");
  if (scope === "ui") return p.startsWith("src/components/") || p.includes("/components/");
  if (scope === "api") return p.startsWith("src/api/") || p.includes("/api/");
  if (scope === "types") return p.startsWith("src/types/") || p.includes("/types/");
  if (scope === "ci") return p.startsWith(".github/") || p.startsWith(".husky/");

  return (
    p.startsWith(`src/features/${scope}`) ||
    p.includes(`/${scope}/`) ||
    p.includes(scope)
  );
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

export function extractAvailableScopes(files: string[] = []): string[] {
  const scopes = new Set<string>();
  for (const f of files) {
    const match = f.match(/^src\/features\/([^/]+)/);
    if (match) scopes.add(match[1]);
    else if (f.startsWith("server/")) scopes.add("server");
    else if (f.startsWith("src/types/")) scopes.add("types");
    else if (f.startsWith("src/api/")) scopes.add("api");
    else if (f.startsWith("src/components/")) scopes.add("ui");
    else if (f.startsWith(".github/")) scopes.add("ci");
  }
  const result = Array.from(scopes).sort();
  return result.length > 0 ? result : ["server", "ui", "types", "api"];
}