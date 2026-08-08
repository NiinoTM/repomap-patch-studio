export interface FuzzyResult {
  filePath: string;
  fileName: string;
  dirPath: string;
  score: number;
  matchedIndices: Set<number>;
}

export function fuzzySearchFiles(files: string[], query: string): FuzzyResult[] {
  if (!query) {
    return files.slice(0, 8).map((f) => {
      const parts = f.split("/");
      const fileName = parts.pop() || f;
      return {
        filePath: f,
        fileName,
        dirPath: parts.join("/"),
        score: 0,
        matchedIndices: new Set<number>(),
      };
    });
  }

  const q = query.toLowerCase();
  const results: FuzzyResult[] = [];

  for (const file of files) {
    const lowerFile = file.toLowerCase();
    let qIdx = 0;
    let score = 0;
    let consecutive = 0;
    const matchedIndices = new Set<number>();

    const parts = file.split("/");
    const fileName = parts.pop() || file;
    const dirPath = parts.join("/");
    const fileNameStartIdx = file.lastIndexOf("/") + 1;

    for (let i = 0; i < file.length; i++) {
      if (qIdx < q.length && lowerFile[i] === q[qIdx]) {
        matchedIndices.add(i);
        qIdx++;
        score += 10;
        consecutive += 1;
        score += consecutive * 5;

        if (i >= fileNameStartIdx) score += 15;

        if (
          i === 0 ||
          i === fileNameStartIdx ||
          " /._-".includes(file[i - 1])
        ) {
          score += 20;
        }
      } else {
        consecutive = 0;
      }
    }

    if (qIdx === q.length) {
      results.push({
        filePath: file,
        fileName,
        dirPath,
        score,
        matchedIndices,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 8);
}