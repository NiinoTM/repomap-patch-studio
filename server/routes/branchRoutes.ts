import { Router, Request, Response } from "express";
import { repoState } from "../adapters/gitAdapter";
import {
  getGitBranch,
  getDetailedBranchList,
  getGitStatusClean,
  gitSwitchBranch,
  gitCreateBranch,
  gitRenameBranch,
  gitMergeBranch,
  gitPruneMergedBranches,
  gitDeleteBranch,
  gitStashChanges,
} from "../adapters/gitBranchAdapter";

export const branchRouter = Router();

branchRouter.get("/branches", (_req: Request, res: Response) => {
  try {
    const targetRepoPath = repoState.getRepoPath();
    const currentBranch = getGitBranch(targetRepoPath);
    const branches = getDetailedBranchList(targetRepoPath);
    const isClean = getGitStatusClean(targetRepoPath);
    res.json({ success: true, currentBranch, branches, isClean });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

branchRouter.post("/branches/switch", (req: Request, res: Response) => {
  const { branch, stash } = req.body;
  if (!branch || typeof branch !== "string") {
    res.status(400).json({ success: false, error: "Invalid branch name" });
    return;
  }
  try {
    const targetRepoPath = repoState.getRepoPath();
    if (stash) {
      gitStashChanges(targetRepoPath);
    }
    gitSwitchBranch(targetRepoPath, branch);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

branchRouter.post("/branches/create", (req: Request, res: Response) => {
  const { name, startPoint } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ success: false, error: "Invalid branch name" });
    return;
  }
  try {
    const targetRepoPath = repoState.getRepoPath();
    gitCreateBranch(targetRepoPath, name, startPoint);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

branchRouter.put("/branches/rename", (req: Request, res: Response) => {
  const { oldName, newName } = req.body;
  if (!oldName || !newName || typeof oldName !== "string" || typeof newName !== "string") {
    res.status(400).json({ success: false, error: "Invalid branch names for rename" });
    return;
  }
  try {
    const targetRepoPath = repoState.getRepoPath();
    gitRenameBranch(targetRepoPath, oldName, newName);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

branchRouter.post("/branches/merge", (req: Request, res: Response) => {
  const { sourceBranch, targetBranch = "main" } = req.body;
  if (!sourceBranch || typeof sourceBranch !== "string") {
    res.status(400).json({ success: false, error: "Invalid source branch name" });
    return;
  }
  try {
    const targetRepoPath = repoState.getRepoPath();
    gitMergeBranch(targetRepoPath, sourceBranch, targetBranch);
    res.json({
      success: true,
      message: `Successfully merged ${sourceBranch} into ${targetBranch}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

branchRouter.post("/branches/prune-merged", (req: Request, res: Response) => {
  const { targetBranch = "main" } = req.body || {};
  try {
    const targetRepoPath = repoState.getRepoPath();
    const pruned = gitPruneMergedBranches(targetRepoPath, targetBranch);
    res.json({ success: true, pruned });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

branchRouter.delete("/branches/delete", (req: Request, res: Response) => {
  const { branch, force } = req.body;
  if (!branch || typeof branch !== "string") {
    res.status(400).json({ success: false, error: "Invalid branch name" });
    return;
  }
  try {
    const targetRepoPath = repoState.getRepoPath();
    gitDeleteBranch(targetRepoPath, branch, Boolean(force));
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});