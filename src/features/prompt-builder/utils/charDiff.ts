import type { DiffLine } from "./lineDiff";

export interface CharDiff {
  type: "added" | "removed" | "unchanged";
  text: string;
}

function tokenize(text: string): string[] {
  return text.match(/[a-zA-Z0-9_$]+|\s+|[^\s\w]/g) || [text];
}

function compactDiffs(diffs: CharDiff[]): CharDiff[] {
  const compacted: CharDiff[] = [];
  for (const d of diffs) {
    const last = compacted[compacted.length - 1];
    if (last && last.type === d.type) {
      last.text += d.text;
    } else {
      compacted.push({ ...d });
    }
  }
  return compacted;
}

function computeTokenLCS(oldTokens: string[], newTokens: string[]): number[][] {
  const n = oldTokens.length;
  const m = newTokens.length;
  const dp: Int32Array[] = Array.from(
    { length: n + 1 },
    () => new Int32Array(m + 1),
  );

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (oldTokens[i] === newTokens[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }
  return dp.map((row) => Array.from(row));
}

function backtrackTokenDiff(
  dp: number[][],
  oldTokens: string[],
  newTokens: string[],
): { oldDiffs: CharDiff[]; newDiffs: CharDiff[] } {
  let i = oldTokens.length;
  let j = newTokens.length;
  const oldDiffs: CharDiff[] = [];
  const newDiffs: CharDiff[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      oldDiffs.push({ type: "unchanged", text: oldTokens[i - 1] });
      newDiffs.push({ type: "unchanged", text: newTokens[j - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      newDiffs.push({ type: "added", text: newTokens[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      oldDiffs.push({ type: "removed", text: oldTokens[i - 1] });
      i--;
    }
  }

  return {
    oldDiffs: compactDiffs(oldDiffs.reverse()),
    newDiffs: compactDiffs(newDiffs.reverse()),
  };
}

function computePairDiff(
  oldLineText: string,
  newLineText: string,
): { oldDiffs: CharDiff[]; newDiffs: CharDiff[] } | null {
  const oldTokens = tokenize(oldLineText);
  const newTokens = tokenize(newLineText);

  if (oldTokens.length === 0 || newTokens.length === 0) return null;

  const dp = computeTokenLCS(oldTokens, newTokens);
  const lcsCount = dp[oldTokens.length][newTokens.length];
  const maxTokens = Math.max(oldTokens.length, newTokens.length);
  const similarity = maxTokens === 0 ? 1 : lcsCount / maxTokens;

  // Only highlight sub-line edits if the lines share at least 40% token similarity
  if (similarity < 0.4) return null;

  return backtrackTokenDiff(dp, oldTokens, newTokens);
}

export function enrichWithCharDiffs(lines: DiffLine[]): DiffLine[] {
  let i = 0;
  while (i < lines.length) {
    if (lines[i].type === "unchanged") {
      i++;
      continue;
    }

    const chunkStart = i;
    while (i < lines.length && lines[i].type !== "unchanged") {
      i++;
    }
    const chunk = lines.slice(chunkStart, i);

    const removed = chunk.filter((l) => l.type === "removed");
    const added = chunk.filter((l) => l.type === "added");

    // Only apply intra-line token diffing on 1:1 paired lines (e.g. 1 line modified)
    if (removed.length > 0 && added.length > 0 && removed.length === added.length) {
      for (let pairIdx = 0; pairIdx < removed.length; pairIdx++) {
        const diffPair = computePairDiff(
          removed[pairIdx].text,
          added[pairIdx].text,
        );
        if (diffPair) {
          removed[pairIdx].charDiffs = diffPair.oldDiffs;
          added[pairIdx].charDiffs = diffPair.newDiffs;
        }
      }
    }
  }

  return lines;
}