import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import {
  repoState,
  getAllFiles,
  getFileStats,
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
    res.json({
      success: true,
      path: targetRepoPath,
      files,
      repoMap,
      fileStats,
      dependencyMap,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

repoRouter.post("/repo", (req: Request, res: Response) => {
  const { newPath } = req.body;
  if (
    typeof newPath === "string" &&
    fs.existsSync(newPath) &&
    fs.statSync(newPath).isDirectory()
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
        contents[f] = fs.readFileSync(path.join(targetRepoPath, f), "utf-8");
      } catch (e) {}
    });
  }
  res.json({ success: true, contents });
});

repoRouter.post("/native-folder-dialog", (_req: Request, res: Response) => {
  try {
    const selectedPath = openNativeFolderDialog();
    res.json({ success: true, path: selectedPath });
  } catch (err) {
    res.json({ success: true, path: "" });
  }
});