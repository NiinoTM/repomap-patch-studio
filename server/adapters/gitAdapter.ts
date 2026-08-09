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

export const isSecretFile = (fileName: string): boolean => /^\.env(\..+)?$/.test(fileName);

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
  fileList: string[] = []
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

export const getAllFiles = (dir: string = targetRepoPath, basePath: string = dir): string[] => {
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
  filesList: string[]
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

export const getGitHistory = (basePath: string = targetRepoPath): HistoryLogItem[] => {
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
  execSync("git reset --hard HEAD~1", {
    cwd: basePath,
    stdio: "ignore",
  });
};

export const gitSnapshotPreEdit = (basePath: string = targetRepoPath): void => {
  try {
    execSync('git add . && git commit -m "pre-ai-edit"', {
      cwd: basePath,
      stdio: "ignore",
    });
  } catch {
    // ignore git error if nothing to commit
  }
};

export const gitMoveFile = (
  basePath: string,
  sourceRel: string,
  destRel: string
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

export const formatFile = (basePath: string, fileRel: string): void => {
  try {
    execSync(`npx prettier --write "${fileRel}"`, {
      cwd: basePath,
      stdio: "ignore",
    });
  } catch {
    // ignore formatting errors
  }
};

export const gitCommit = (
  basePath: string,
  message: string = "ai-edit: updated files"
): void => {
  execSync(`git add . && git commit -m "${message}"`, {
    cwd: basePath,
    stdio: "ignore",
  });
};