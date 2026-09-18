import { Router, Request, Response } from "express";
import {
  fileExists,
  isDirectory,
  readTextFile,
  joinPath,
} from "../adapters/fsAdapter";
import { repoState, getAllFiles, getFileStats } from "../adapters/gitAdapter";
import {
  getGitBranch,
  getGitBranches,
  getGitStatusClean,
  getDetailedBranchList,
  gitSwitchBranch,
  gitCreateBranch,
  gitRenameBranch,
  gitDeleteBranch,
  gitStashChanges,
  gitMergeBranch,
  gitPruneMergedBranches,
} from "../adapters/gitBranchAdapter";
import { generateRepoMap } from "../services/repoMapService";
import { getDependencyMap } from "../services/dependencyService";
import { extractExportContracts } from "../services/contractExtractorService";
import { openNativeFolderDialog } from "../adapters/osAdapter";
import {
  bootstrapRepository,
  ensureGitRepository,
} from "../adapters/packageManagerAdapter";

export const repoRouter = Router();

function buildRepoPayload(targetRepoPath: string) {
  const files = getAllFiles(targetRepoPath);
  return {
    success: true,
    path: targetRepoPath,
    files,
    repoMap: generateRepoMap(targetRepoPath, files),
    fileStats: getFileStats(targetRepoPath, files),
    dependencyMap: getDependencyMap(targetRepoPath, files),
    branch: getGitBranch(targetRepoPath),
    branches: getGitBranches(targetRepoPath),
    isClean: getGitStatusClean(targetRepoPath),
  };
}

repoRouter.get("/repo", (_req: Request, res: Response) => {
  try {
    res.json(buildRepoPayload(repoState.getRepoPath()));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

repoRouter.post("/repo", (req: Request, res: Response) => {
  const { newPath } = req.body;
  if (typeof newPath === "string" && fileExists(newPath) && isDirectory(newPath)) {
    repoState.setRepoPath(newPath);
    res.json(buildRepoPayload(repoState.getRepoPath()));
  } else {
    res.status(400).json({ success: false, error: "Invalid or missing directory path." });
  }
});

repoRouter.post("/repo/git-init", async (_req: Request, res: Response) => {
  try {
    const targetRepoPath = repoState.getRepoPath();
    const output = await ensureGitRepository(targetRepoPath);
    res.json({ success: true, output });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

repoRouter.post("/repo/bootstrap", async (_req: Request, res: Response) => {
  try {
    const targetRepoPath = repoState.getRepoPath();
    const result = await bootstrapRepository(targetRepoPath);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
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

repoRouter.get("/branches", (_req: Request, res: Response) => {
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

repoRouter.post("/branches/switch", (req: Request, res: Response) => {
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

repoRouter.post("/branches/create", (req: Request, res: Response) => {
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

repoRouter.put("/branches/rename", (req: Request, res: Response) => {
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

repoRouter.post("/branches/merge", (req: Request, res: Response) => {
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

repoRouter.post("/branches/prune-merged", (req: Request, res: Response) => {
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

repoRouter.delete("/branches/delete", (req: Request, res: Response) => {
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

repoRouter.post(
  ["/extract-contracts", "/repo/extract-contracts"],
  async (req: Request, res: Response) => {
    try {
      const targetRepoPath = repoState.getRepoPath();
      const repoPath = (req.body.repoPath as string) || targetRepoPath || process.cwd();
      const paths = Array.isArray(req.body.paths) ? (req.body.paths as string[]) : [];
      const contracts = paths.length > 0 ? await extractExportContracts(repoPath, paths) : {};
      res.json({ success: true, contracts });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, contracts: {}, error: message });
    }
  },
);

repoRouter.post(
  ["/extract-contracts", "/repo/extract-contracts"],
  async (req: Request, res: Response) => {
    try {
      const targetRepoPath = repoState.getRepoPath();
      const repoPath = (req.body.repoPath as string) || targetRepoPath || process.cwd();
      const paths = Array.isArray(req.body.paths) ? (req.body.paths as string[]) : [];
      const contracts = paths.length > 0 ? await extractExportContracts(repoPath, paths) : {};
      res.json({ success: true, contracts });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, contracts: {}, error: message });
    }
  },
);
