import fs from "fs";
import path from "path";
import { execSync } from "child_process";

let targetRepoPath: string = process.cwd();

export const repoState = {
  getRepoPath: (): string => targetRepoPath,
  setRepoPath: (newPath: string): void => {
    targetRepoPath = path.resolve(newPath);
  },
};

export const isSecretFile = (fileName: string): boolean =>
  /^\.env(\..+)?$/.test(fileName);

const HEAVY_DIR_SEGMENTS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".vscode",
  ".idea",
  "backups",
]);

const HEAVY_FILE_EXTENSIONS = new Set([".sqlite", ".sqlite3", ".db", ".log"]);

export const isHeavyOrJunkPath = (filePath: string): boolean => {
  const segments = filePath.split("/");
  if (segments.some((seg) => HEAVY_DIR_SEGMENTS.has(seg))) return true;
  const ext = path.extname(filePath).toLowerCase();
  return HEAVY_FILE_EXTENSIONS.has(ext);
};

export const getAllFilesFallback = (
  dir: string,
  basePath: string = dir,
  fileList: string[] = [],
): string[] => {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (
        ![
          "node_modules",
          ".git",
          "dist",
          "build",
          "coverage",
          ".vscode",
          ".idea",
        ].includes(file)
      ) {
        getAllFilesFallback(filePath, basePath, fileList);
      }
    } else if (!isSecretFile(file)) {
      fileList.push(path.relative(basePath, filePath).replace(/\\/g, "/"));
    }
  }
  return fileList;
};

export const getAllFiles = (
  dir: string = targetRepoPath,
  basePath: string = dir,
): string[] => {
  try {
    const raw = execSync("git ls-files --cached --others --exclude-standard", {
      cwd: basePath,
      encoding: "utf-8",
    });
    return raw
      .split(/\r?\n/)
      .map((f) => f.trim())
      .filter(Boolean)
      .filter((f) => !isSecretFile(path.basename(f)))
      .filter((f) => !isHeavyOrJunkPath(f));
  } catch {
    return getAllFilesFallback(dir, basePath);
  }
};

export interface FileStat {
  size: number;
  tokens: number;
}

export const getFileStats = (
  basePath: string = targetRepoPath,
  filesList: string[],
): Record<string, FileStat> => {
  const stats: Record<string, FileStat> = {};
  for (const file of filesList) {
    try {
      const fullPath = path.join(basePath, file);
      const size = fs.statSync(fullPath).size;
      stats[file] = { size, tokens: Math.ceil(size / 3.8) };
    } catch {
      stats[file] = { size: 0, tokens: 0 };
    }
  }
  return stats;
};

export interface HistoryLogItem {
  id: string;
  timestamp: string;
  message: string;
  files: string[];
}

export const getGitBranch = (basePath: string = targetRepoPath): string => {
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

export const getDirtyFiles = (basePath: string = targetRepoPath): string[] => {
  try {
    const raw = execSync("git status --porcelain", {
      cwd: basePath,
      encoding: "utf-8",
    });
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim().slice(3).trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

export const getGitStatusClean = (
  basePath: string = targetRepoPath,
): boolean => {
  try {
    const raw = execSync("git status --porcelain", {
      cwd: basePath,
      encoding: "utf-8",
    });
    return raw.trim().length === 0;
  } catch {
    return true; // Fallback
  }
};

export const getGitHistory = (
  basePath: string = targetRepoPath,
): HistoryLogItem[] => {
  try {
    const raw = execSync(
      `git log -n 30 --no-merges --pretty=format:%H%x09%ar%x09%s --name-only`,
      { cwd: basePath, encoding: "utf-8" },
    );

    return raw
      .split(/\r?\n\r?\n/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => {
        const lines = block.split(/\r?\n/);
        const [hash, timestamp, message] = lines[0].split("\t");
        const files = lines.slice(1).filter(Boolean);
        return {
          id: hash ? hash.slice(0, 7) : "unknown",
          timestamp: timestamp || "",
          message: message || "",
          files,
        };
      })
      .filter((log) => log.message !== "pre-ai-edit");
  } catch {
    return [];
  }
};

export const gitUndo = (basePath: string = targetRepoPath): void => {
  const isClean = getGitStatusClean(basePath);
  if (!isClean) {
    // Revert uncommitted draft edits in working directory
    execSync("git checkout -- . && git clean -fd", {
      cwd: basePath,
      stdio: "ignore",
    });
  } else {
    // Revert last actual Git commit
    execSync("git reset --hard HEAD~1", {
      cwd: basePath,
      stdio: "ignore",
    });
  }
};

export const gitSwitchBranch = (basePath: string, branch: string): void => {
  execSync(`git checkout "${branch}"`, { cwd: basePath, stdio: "ignore" });
};

export const gitMoveFile = (
  basePath: string,
  sourceRel: string,
  destRel: string,
): void => {
  const destFullPath = path.resolve(basePath, destRel);
  const destDir = path.dirname(destFullPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  try {
    execSync(`git mv -f "${sourceRel}" "${destRel}"`, {
      cwd: basePath,
      stdio: "ignore",
    });
  } catch {
    fs.renameSync(path.resolve(basePath, sourceRel), destFullPath);
  }
};

export const formatFiles = (basePath: string, filesRel: string[]): void => {
  if (filesRel.length === 0) return;
  try {
    const quotedFiles = filesRel.map((f) => `"${f}"`).join(" ");
    execSync(`npx prettier --write ${quotedFiles}`, {
      cwd: basePath,
      stdio: "ignore",
    });
  } catch {
    return;
  }
};

// execSync throws with .stdout/.stderr attached at runtime, but Node's
// own ExecException type doesn't declare them — a local shape + guard
// beats `any` or a blind cast.
interface ExecError extends Error {
  stdout?: string | Buffer;
  stderr?: string | Buffer;
}

const isExecError = (err: unknown): err is ExecError => err instanceof Error;

export const gitCommit = (
  basePath: string,
  message: string = "ai-edit: updated files",
): void => {
  try {
    execSync(`git add . && git commit -m "${message}"`, {
      cwd: basePath,
      encoding: "utf-8",
    });
  } catch (error: unknown) {
    // If Husky hooks fail, capture the linter output so it reaches the UI
    const execError = isExecError(error) ? error : null;
    const output = (
      execError?.stdout ||
      execError?.stderr ||
      execError?.message ||
      "Unknown Git error"
    )
      .toString()
      .trim();
    throw new Error(`Git commit rejected (Husky hooks failed):\n${output}`, {
      cause: error,
    });
  }
};
