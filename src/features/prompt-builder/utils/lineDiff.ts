export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface LineDiffStats {
  added: number;
  removed: number;
  unchanged: number;
}

/**
 * Computes a line-by-line diff between search (old) and replace (new) text
 * using Myers / LCS line matching with prefix and suffix trimming.
 */
function getCommonBounds(oldLines: string[], newLines: string[]) {
  let start = 0;
  while (
    start < oldLines.length &&
    start < newLines.length &&
    oldLines[start] === newLines[start]
  ) {
    start++;
  }

  let oldEnd = oldLines.length - 1;
  let newEnd = newLines.length - 1;
  while (
    oldEnd >= start &&
    newEnd >= start &&
    oldLines[oldEnd] === newLines[newEnd]
  ) {
    oldEnd--;
    newEnd--;
  }

  return { start, oldEnd, newEnd };
}

function buildPrefixLines(oldLines: string[], start: number): DiffLine[] {
  return oldLines.slice(0, start).map((text, idx) => ({
    type: "unchanged",
    text,
    oldLineNumber: idx + 1,
    newLineNumber: idx + 1,
  }));
}

function buildSuffixLines(
  oldLines: string[],
  newLines: string[],
  oldEnd: number,
): DiffLine[] {
  const suffixLines: DiffLine[] = [];
  for (let k = oldEnd + 1; k < oldLines.length; k++) {
    const newIdx = newLines.length - (oldLines.length - k);
    suffixLines.push({
      type: "unchanged",
      text: oldLines[k],
      oldLineNumber: k + 1,
      newLineNumber: newIdx + 1,
    });
  }
  return suffixLines;
}

function buildLCSMatrix(midOld: string[], midNew: string[]): number[][] {
  const n = midOld.length;
  const m = midNew.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (midOld[i] === midNew[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }
  return dp;
}

function backtrackLCS(
  dp: number[][],
  midOld: string[],
  midNew: string[],
  start: number,
): DiffLine[] {
  let i = midOld.length;
  let j = midNew.length;
  const temp: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && midOld[i - 1] === midNew[j - 1]) {
      temp.push({
        type: "unchanged",
        text: midOld[i - 1],
        oldLineNumber: start + i,
        newLineNumber: start + j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      temp.push({
        type: "added",
        text: midNew[j - 1],
        newLineNumber: start + j,
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      temp.push({
        type: "removed",
        text: midOld[i - 1],
        oldLineNumber: start + i,
      });
      i--;
    }
  }

  return temp.reverse();
}

function computeMidDiff(
  midOld: string[],
  midNew: string[],
  start: number,
): DiffLine[] {
  const n = midOld.length;
  const m = midNew.length;

  if (n === 0 && m > 0) {
    return midNew.map((text, j) => ({
      type: "added",
      text,
      newLineNumber: start + j + 1,
    }));
  }

  if (m === 0 && n > 0) {
    return midOld.map((text, i) => ({
      type: "removed",
      text,
      oldLineNumber: start + i + 1,
    }));
  }

  if (n > 0 && m > 0) {
    const dp = buildLCSMatrix(midOld, midNew);
    return backtrackLCS(dp, midOld, midNew, start);
  }

  return [];
}

/**
 * Computes a line-by-line diff between search (old) and replace (new) text
 * using Myers / LCS line matching with prefix and suffix trimming.
 */
export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  if (!oldText && !newText) return [];

  if (!oldText) {
    return newText.split("\n").map((text, idx) => ({
      type: "added",
      text,
      newLineNumber: idx + 1,
    }));
  }

  if (!newText) {
    return oldText.split("\n").map((text, idx) => ({
      type: "removed",
      text,
      oldLineNumber: idx + 1,
    }));
  }

  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  const { start, oldEnd, newEnd } = getCommonBounds(oldLines, newLines);

  const prefixLines = buildPrefixLines(oldLines, start);
  const suffixLines = buildSuffixLines(oldLines, newLines, oldEnd);

  const midOld = oldLines.slice(start, oldEnd + 1);
  const midNew = newLines.slice(start, newEnd + 1);
  const midDiff = computeMidDiff(midOld, midNew, start);

  return [...prefixLines, ...midDiff, ...suffixLines];
}

export function getLineDiffStats(lines: DiffLine[]): LineDiffStats {
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  for (const line of lines) {
    if (line.type === "added") added++;
    else if (line.type === "removed") removed++;
    else unchanged++;
  }
  return { added, removed, unchanged };
}