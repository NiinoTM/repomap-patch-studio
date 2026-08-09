export interface FuzzyResult {
  filePath: string;
  score: number;
  matches: number[];
}

function trySubstringMatch(
  filePath: string,
  lowerPath: string,
  query: string,
  lowerQuery: string,
): FuzzyResult | null {
  const substringIdx = lowerPath.indexOf(lowerQuery);
  if (substringIdx === -1) return null;

  const matches: number[] = [];
  for (let i = 0; i < lowerQuery.length; i++) {
    matches.push(substringIdx + i);
  }

  let score = 1000 - filePath.length; // Favor shorter paths

  // Bonus if it matches the start of the filename
  const lastSlash = lowerPath.lastIndexOf("/");
  if (substringIdx === lastSlash + 1) {
    score += 500;
  } else if (substringIdx > lastSlash) {
    score += 200; // Matches somewhere inside the filename
  }

  // Exact case match bonus
  if (filePath.includes(query)) {
    score += 100;
  }

  return { filePath, score, matches };
}

function tryFuzzyMatch(
  filePath: string,
  lowerPath: string,
  query: string,
  lowerQuery: string,
): FuzzyResult | null {
  const matches: number[] = [];
  let queryIdx = lowerQuery.length - 1;
  let pathIdx = lowerPath.length - 1;
  let score = 0;
  let consecutive = 0;

  while (pathIdx >= 0 && queryIdx >= 0) {
    if (lowerPath[pathIdx] === lowerQuery[queryIdx]) {
      matches.push(pathIdx);

      score += 10; // Base match score
      if (consecutive > 0) {
        score += consecutive * 5; // Consecutive characters matter a lot
      }

      const isBoundary =
        pathIdx === 0 || ["/", ".", "-", "_"].includes(lowerPath[pathIdx - 1]);

      if (isBoundary) {
        score += 20;
        if (pathIdx === lowerPath.lastIndexOf("/") + 1) {
          score += 40; // Massive bonus for filename boundary
        }
      }

      if (filePath[pathIdx] === query[queryIdx]) {
        score += 5; // Exact case
      }

      consecutive++;
      queryIdx--;
    } else {
      consecutive = 0;
    }
    pathIdx--;
  }

  // Only accept if all characters in the query were found
  if (queryIdx < 0) {
    score -= filePath.length; // Slight penalty for longer paths
    // Reverse matches since we collected them right-to-left
    return { filePath, score, matches: matches.reverse() };
  }

  return null;
}

export function fuzzySearchFiles(
  files: string[],
  query: string,
): FuzzyResult[] {
  if (!query) {
    return files.slice(0, 20).map((filePath) => ({
      filePath,
      score: 0,
      matches: [],
    }));
  }

  const results: FuzzyResult[] = [];
  const lowerQuery = query.toLowerCase();

  for (const filePath of files) {
    const lowerPath = filePath.toLowerCase();

    // 1. Direct Substring Match (Highest priority)
    let match = trySubstringMatch(filePath, lowerPath, query, lowerQuery);

    // 2. Right-to-Left Greedy Fuzzy Match (Fallback)
    if (!match) {
      match = tryFuzzyMatch(filePath, lowerPath, query, lowerQuery);
    }

    if (match) {
      results.push(match);
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 20);
}
