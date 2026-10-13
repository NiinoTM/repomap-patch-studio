import { repoState, gitExec } from "./gitAdapter";

export interface BranchDetails {
  name: string;
  isCurrent: boolean;
  commitHash: string;
  commitMessage: string;
  upstream?: string;
  isMerged?: boolean;
}

export const getMergedBranches = (
  basePath: string = repoState.getRepoPath(),
  targetBranch: string = "main",
): string[] => {
  try {
    const raw = gitExec(
      ["branch", "--merged", targetBranch, "--format=%(refname:short)"],
      basePath,
    );
    return raw
      .split(/\r?\n/)
      .map((b) => b.trim())
      .filter(Boolean)
      .filter((b) => b !== targetBranch && !b.startsWith("origin/"));
  } catch {
    return [];
  }
};

export const getDetailedBranchList = (
  basePath: string = repoState.getRepoPath(),
): BranchDetails[] => {
  try {
    const allBranches = getGitBranches(basePath);
    const targetBranch = allBranches.includes("main") ? "main" : "master";
    const mergedList = new Set(getMergedBranches(basePath, targetBranch));

    const raw = gitExec(
      [
        "branch",
        "--format=%(refname:short)|%(HEAD)|%(objectname:short)|%(contents:subject)|%(upstream:short)",
      ],
      basePath,
    );
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, head, commitHash, commitMessage, upstream] =
          line.split("|");
        const branchName = name || "unknown";
        return {
          name: branchName,
          isCurrent: head === "*",
          commitHash: commitHash || "",
          commitMessage: commitMessage || "",
          upstream: upstream || undefined,
          isMerged: branchName !== targetBranch && mergedList.has(branchName),
        };
      });
  } catch {
    return [];
  }
};

export const getGitBranch = (
  basePath: string = repoState.getRepoPath(),
): string => {
  try {
    return (
      gitExec(["branch", "--show-current"], basePath).trim() || "unknown"
    );
  } catch {
    return "unknown";
  }
};

export const getGitBranches = (
  basePath: string = repoState.getRepoPath(),
): string[] => {
  try {
    const raw = gitExec(
      ["branch", "--format=%(refname:short)"],
      basePath,
    );
    return raw
      .split(/\r?\n/)
      .map((b) => b.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

export const getGitStatusClean = (
  basePath: string = repoState.getRepoPath(),
): boolean => {
  try {
    const raw = gitExec(["status", "--porcelain"], basePath);
    return raw.trim().length === 0;
  } catch {
    return true;
  }
};

export const gitSwitchBranch = (basePath: string, branch: string): void => {
  gitExec(["checkout", branch], basePath);
};

export const gitCreateBranch = (
  basePath: string,
  name: string,
  startPoint?: string,
): void => {
  const args = startPoint
    ? ["checkout", "-b", name, startPoint]
    : ["checkout", "-b", name];
  gitExec(args, basePath);
};

export const gitRenameBranch = (
  basePath: string,
  oldName: string,
  newName: string,
): void => {
  gitExec(["branch", "-m", oldName, newName], basePath);
};

export const gitMergeBranch = (
  basePath: string,
  sourceBranch: string,
  targetBranch: string = "main",
): void => {
  gitExec(["checkout", targetBranch], basePath);
  gitExec(["merge", sourceBranch, "--no-edit"], basePath);
};

export const gitPruneMergedBranches = (
  basePath: string = repoState.getRepoPath(),
  targetBranch: string = "main",
): string[] => {
  const merged = getMergedBranches(basePath, targetBranch);
  const current = getGitBranch(basePath);
  const pruned: string[] = [];

  for (const branch of merged) {
    if (branch !== targetBranch && branch !== current) {
      try {
        gitExec(["branch", "-d", branch], basePath);
        pruned.push(branch);
      } catch {
        // Skip branch if it cannot be safely deleted
      }
    }
  }
  return pruned;
};

export const gitDeleteBranch = (
  basePath: string,
  branch: string,
  force: boolean = false,
): void => {
  const flag = force ? "-D" : "-d";
  gitExec(["branch", flag, branch], basePath);
};

export const gitStashChanges = (
  basePath: string,
  message: string = "Auto-stashed before branch switch",
): void => {
  gitExec(["stash", "push", "-m", message], basePath);
};
