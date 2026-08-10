import { Router, Request, Response } from "express";
import {
  fileExists,
  isDirectory,
  readTextFile,
  joinPath,
} from "../adapters/fsAdapter";
import { repoState, getAllFiles, getFileStats } from "../adapters/gitAdapter";
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
    res.json({
      success: true,
      path: targetRepoPath,
      files,
      repoMap,
      fileStats,
      dependencyMap,
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
    res.json({
      success: true,
      path: targetRepoPath,
      files,
      repoMap,
      fileStats,
      dependencyMap,
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

repoRouter.post("/native-folder-dialog", (_req: Request, res: Response) => {
  try {
    const result = openNativeFolderDialog();
    if (result.error) {
      res.json({ success: false, path: "", error: result.error });
      return;
    }
    res.json({ success: true, path: result.path });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.json({ success: false, path: "", error: message });
  }
});
