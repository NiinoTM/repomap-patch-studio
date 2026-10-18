import fs from "fs";
import path from "path";
import { spawnSync, execSync } from "child_process";

let targetRepoPath: string = process.cwd();

export const repoState = {
  getRepoPath: (): string => targetRepoPath,
  setRepoPath: (newPath: string): void => {
    targetRepoPath = path.resolve(newPath);
  },
};

export interface ExecError extends Error {
  stdout?: string | Buffer;
  stderr?: string | Buffer;
}

export const isExecError = (err: unknown): err is ExecError => err instanceof Error;

export const toGitPath = (p: string): string =>
  p.startsWith("\\\\") || p.startsWith("//") ? "//" + p.slice(2).replace(/\\/g, "/") : p.replace(/\\/g, "/");

const stringify = (val: unknown): string => String(val || "");

export function runGitSync(
  args: string[],
  basePath = targetRepoPath,
  options?: { stdio?: "pipe" | "ignore"; encoding?: BufferEncoding },
): { stdout: string; stderr: string; status: number | null; error?: Error } {
  const gitArgs = ["-c", "safe.directory=*", "-C", toGitPath(basePath), ...args];
  const res = spawnSync("git", gitArgs, {
    encoding: options?.encoding || "utf-8",
    stdio: options?.stdio || "pipe",
    windowsHide: true,
    maxBuffer: 50 * 1024 * 1024,
    shell: false,
  });

  return {
    stdout: stringify(res.stdout),
    stderr: stringify(res.stderr || res.error?.message),
    status: res.status,
    error: res.error,
  };
}

export function gitExec(args: string[], basePath: string = targetRepoPath): string {
  const res = runGitSync(args, basePath);
  if (res.status !== 0 || res.error) {
    const msg = res.stderr.trim() || res.stdout.trim() || res.error?.message || `Git failed with code ${res.status}`;
    const err = new Error(msg) as ExecError;
    err.stdout = res.stdout;
    err.stderr = res.stderr;
    throw err;
  }
  return res.stdout;
}

export const isSecretFile = (fileName: string): boolean => /^\.env(\..+)?$/.test(fileName);

const HEAVY_DIR_SEGMENTS = new Set([
  "node_modules", ".git", "dist", "build", "coverage", ".vscode", ".idea", "backups",
]);

const HEAVY_FILE_EXTENSIONS = new Set([".sqlite", ".sqlite3", ".db", ".log"]);

export const isHeavyOrJunkPath = (filePath: string): boolean => {
  const segments = filePath.split("/");
  if (segments.some((seg) => HEAVY_DIR_SEGMENTS.has(seg))) return true;
  return HEAVY_FILE_EXTENSIONS.has(path.extname(filePath).toLowerCase());
};

export const getAllFilesFallback = (
  dir: string,
  basePath = dir,
  fileList: string[] = [],
): string[] => {
if (!fs.existsSync(dir) || fileList.length >= 5000) return fileList;
  try {
    for (const file of fs.readdirSync(dir)) {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) {
        if (!HEAVY_DIR_SEGMENTS.has(file)) getAllFilesFallback(full, basePath, fileList);
      } else if (!isSecretFile(file)) {
        fileList.push(path.relative(basePath, full).replace(/\\/g, "/"));
      }
    }
  } catch {
    // Skip unreadable directory
  }
  return fileList;
};

export const getAllFiles = (dir: string = targetRepoPath, basePath: string = dir): string[] => {
  try {
    const raw = gitExec(["ls-files", "--cached", "--others", "--exclude-standard"], basePath);
    return raw
      .split(/\r?\n/)
      .map((f) => f.trim())
      .filter((f) => f && !isSecretFile(path.basename(f)) && !isHeavyOrJunkPath(f));
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
      const size = fs.statSync(path.join(basePath, file)).size;
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
    return gitExec(["branch", "--show-current"], basePath).trim() || "unknown";
  } catch {
    return "unknown";
  }
};

export const getDirtyFiles = (basePath: string = targetRepoPath): string[] => {
  try {
    return gitExec(["status", "--porcelain"], basePath)
      .split(/\r?\n/)
      .map((line) => line.trim().slice(3).trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

export const getGitStatusClean = (basePath: string = targetRepoPath): boolean => {
  try {
    return gitExec(["status", "--porcelain"], basePath).trim().length === 0;
  } catch {
    return true;
  }
};

export const getGitHistory = (basePath: string = targetRepoPath): HistoryLogItem[] => {
  try {
    const raw = gitExec(
      ["log", "-n", "30", "--no-merges", "--pretty=format:%H\t%ar\t%s", "--name-only"],
      basePath,
    );
    return raw
      .split(/\r?\n\r?\n/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => {
        const lines = block.split(/\r?\n/);
        const [hash, timestamp, message] = lines[0].split("\t");
        return {
          id: hash ? hash.slice(0, 7) : "unknown",
          timestamp: timestamp || "",
          message: message || "",
          files: lines.slice(1).filter(Boolean),
        };
      })
      .filter((log) => log.message !== "pre-ai-edit");
  } catch {
    return [];
  }
};

export const gitUndo = (basePath: string = targetRepoPath): void => {
if (!getGitStatusClean(basePath)) {
    gitExec(["checkout", "--", "."], basePath);
    gitExec(["clean", "-fd"], basePath);
  } else {
    gitExec(["reset", "--hard", "HEAD~1"], basePath);
  }
};

export const gitSwitchBranch = (basePath: string, branch: string): void => {
  gitExec(["checkout", branch], basePath);
};

export const gitMoveFile = (basePath: string, sourceRel: string, destRel: string): void => {
  const destFullPath = path.resolve(basePath, destRel);
  const destDir = path.dirname(destFullPath);
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  try {
    gitExec(["mv", "-f", sourceRel, destRel], basePath);
  } catch {
    fs.renameSync(path.resolve(basePath, sourceRel), destFullPath);
  }
};

export const formatFiles = (basePath: string, filesRel: string[]): void => {
  if (filesRel.length === 0) return;
  try {
    const quotedFiles = filesRel.map((f) => `"${f}"`).join(" ");
    const isUNC = process.platform === "win32" && (basePath.startsWith("\\\\") || basePath.startsWith("//"));
    const cmd = isUNC
      ? `pushd "${basePath}" && npx prettier --write ${quotedFiles} && popd`
      : `npx prettier --write ${quotedFiles}`;
    execSync(cmd, isUNC ? { stdio: "ignore" } : { cwd: basePath, stdio: "ignore" });
  } catch {
    // Ignore formatting failure
  }
};

export const gitCommit = (basePath: string, message = "ai-edit: updated files"): void => {
  try {
    gitExec(["add", "."], basePath);
    gitExec(["commit", "-m", message], basePath);
  } catch (error: unknown) {
    const execError = isExecError(error) ? error : null;
    const output = (execError?.stdout || execError?.stderr || execError?.message || "Unknown Git error")
      .toString()
      .trim();
    throw new Error(`Git commit rejected (Husky hooks failed):\n${output}`, { cause: error });
  }
};