import { Router, Request, Response } from "express";
import {
  fileExists,
  isDirectory,
  readTextFile,
  joinPath,
} from "../adapters/fsAdapter";
import {
  repoState,
  getAllFiles,
  getFileStats,
  getGitBranch,
  getGitBranches,
  getGitStatusClean,
  gitSwitchBranch,
} from "../adapters/gitAdapter";
import { generateRepoMap } from "../services/repoMapService";
import { getDependencyMap } from "../services/dependencyService";
import { openNativeFolderDialog } from "../adapters/osAdapter";

export const repoRouter = Router();

repoRouter.get("/repo", (_req: Request, res: Response) => {
  try {
    const targetRepoPath = repoState.getRepoPath();
    const files = getAllFiles(targetRepoPath);
    const repoMap = generateRepoMap(targetRepoPath, files);
    const fileStats = getFileStats(targetRepoPath, files);
    const dependencyMap = getDependencyMap(targetRepoPath, files);
    const branch = getGitBranch(targetRepoPath);
    const branches = getGitBranches(targetRepoPath);
    const isClean = getGitStatusClean(targetRepoPath);
    res.json({
      success: true,
      path: targetRepoPath,
      files,
      repoMap,
      fileStats,
      dependencyMap,
      branch,
      branches,
      isClean,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

repoRouter.post("/repo", (req: Request, res: Response) => {
  const { newPath } = req.body;
  if (
    typeof newPath === "string" &&
    fileExists(newPath) &&
    isDirectory(newPath)
  ) {
    repoState.setRepoPath(newPath);
    const targetRepoPath = repoState.getRepoPath();
    const files = getAllFiles(targetRepoPath);
    const repoMap = generateRepoMap(targetRepoPath, files);
    const fileStats = getFileStats(targetRepoPath, files);
    const dependencyMap = getDependencyMap(targetRepoPath, files);
    const branch = getGitBranch(targetRepoPath);
    const branches = getGitBranches(targetRepoPath);
    const isClean = getGitStatusClean(targetRepoPath);
    res.json({
      success: true,
      path: targetRepoPath,
      files,
      repoMap,
      fileStats,
      dependencyMap,
      branch,
      branches,
      isClean,
    });
  } else {
    res
      .status(400)
      .json({ success: false, error: "Invalid or missing directory path." });
  }
});

repoRouter.post("/files", (req: Request, res: Response) => {
  const { files } = req.body;
  const targetRepoPath = repoState.getRepoPath();
  const contents: Record<string, string> = {};
  if (Array.isArray(files)) {
    files.forEach((f: string) => {
      try {
        contents[f] = readTextFile(joinPath(targetRepoPath, f));
      } catch {
        // unreadable file — skip it, contents[f] stays unset
      }
    });
  }
  res.json({ success: true, contents });
});

repoRouter.post("/switch-branch", (req: Request, res: Response) => {
  const { branch } = req.body;
  if (!branch || typeof branch !== "string") {
    res.status(400).json({ success: false, error: "Invalid branch name" });
    return;
  }
  try {
    const targetRepoPath = repoState.getRepoPath();
    gitSwitchBranch(targetRepoPath, branch);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

repoRouter.post(
  "/native-folder-dialog",
  async (_req: Request, res: Response) => {
    try {
      const result = await openNativeFolderDialog();
      if (result.error) {
        res.json({ success: false, path: "", error: result.error });
        return;
      }
      res.json({ success: true, path: result.path });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.json({ success: false, path: "", error: message });
    }
  },
);
