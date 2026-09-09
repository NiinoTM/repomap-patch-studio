function isBusinessLogicFile(filePath: string): boolean {
  if (!filePath) return false;
  const p = filePath.replace(/\\/g, "/");

  if (!/\.(ts|tsx|js|jsx)$/.test(p)) return false;
  if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(p)) return false;
  if (p.includes("/types/") || p.endsWith(".d.ts")) return false;

  if (
    p.startsWith("vite.config") ||
    p.startsWith("eslint.config") ||
    p.includes("src/main.tsx") ||
    p.includes("src/index.") ||
    p.includes("server/index.")
  ) {
    return false;
  }

  return (
    p.includes("/services/") ||
    p.includes("/utils/") ||
    p.includes("/hooks/") ||
    p.includes("/adapters/")
  );
}

function hasMatchingTest(file: string, candidatePool: Set<string>): boolean {
  const p = file.replace(/\\/g, "/");
  const extMatch = p.match(/\.(ts|tsx|js|jsx)$/);
  if (!extMatch || extMatch.index === undefined) return false;

  const basePath = p.slice(0, extMatch.index);
  const testExtensions = [
    ".test.ts",
    ".test.tsx",
    ".spec.ts",
    ".spec.tsx",
    ".test.js",
    ".spec.js",
  ];

  return testExtensions.some((ext) => candidatePool.has(`${basePath}${ext}`));
}

export function findUntestedFiles(
  changedFiles: string[],
  repoFiles: string[] = [],
): string[] {
  const normalizedChanged = changedFiles.map((f) => f.replace(/\\/g, "/"));
  const normalizedRepo = new Set(repoFiles.map((f) => f.replace(/\\/g, "/")));
  const pool = new Set([...normalizedRepo, ...normalizedChanged]);

  return normalizedChanged.filter((file) => {
    if (!isBusinessLogicFile(file)) return false;
    return !hasMatchingTest(file, pool);
  });
}