import { execSync } from "child_process";
import { repoState } from "./gitAdapter";

export interface BranchDetails {
  name: string;
  isCurrent: boolean;
  commitHash: string;
  commitMessage: string;
  upstream?: string;
}

export const getDetailedBranchList = (
  basePath: string = repoState.getRepoPath(),
): BranchDetails[] => {
  try {
    const raw = execSync(
      'git branch --format="%(refname:short)|%(HEAD)|%(objectname:short)|%(contents:subject)|%(upstream:short)"',
      { cwd: basePath, encoding: "utf-8" },
    );
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, head, commitHash, commitMessage, upstream] =
          line.split("|");
        return {
          name: name || "unknown",
          isCurrent: head === "*",
          commitHash: commitHash || "",
          commitMessage: commitMessage || "",
          upstream: upstream || undefined,
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
      execSync("git branch --show-current", {
        cwd: basePath,
        encoding: "utf-8",
      }).trim() || "unknown"
    );
  } catch {
    return "unknown";
  }
};

export const getGitStatusClean = (
  basePath: string = repoState.getRepoPath(),
): boolean => {
  try {
    const raw = execSync("git status --porcelain", {
      cwd: basePath,
      encoding: "utf-8",
    });
    return raw.trim().length === 0;
  } catch {
    return true;
  }
};

export const gitSwitchBranch = (basePath: string, branch: string): void => {
  execSync(`git checkout "${branch}"`, { cwd: basePath, stdio: "ignore" });
};

export const gitCreateBranch = (
  basePath: string,
  name: string,
  startPoint?: string,
): void => {
  const cmd = startPoint
    ? `git checkout -b "${name}" "${startPoint}"`
    : `git checkout -b "${name}"`;
  execSync(cmd, { cwd: basePath, stdio: "ignore" });
};

export const gitRenameBranch = (
  basePath: string,
  oldName: string,
  newName: string,
): void => {
  execSync(`git branch -m "${oldName}" "${newName}"`, {
    cwd: basePath,
    stdio: "ignore",
  });
};

export const gitDeleteBranch = (
  basePath: string,
  branch: string,
  force: boolean = false,
): void => {
  const flag = force ? "-D" : "-d";
  execSync(`git branch ${flag} "${branch}"`, {
    cwd: basePath,
    stdio: "ignore",
  });
};

export const gitStashChanges = (
  basePath: string,
  message: string = "Auto-stashed before branch switch",
): void => {
  execSync(`git stash push -m "${message}"`, {
    cwd: basePath,
    stdio: "ignore",
  });
};
