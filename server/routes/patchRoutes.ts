import { Router, Request, Response } from "express";
import { repoState, gitUndo } from "../adapters/gitAdapter";
import { DiffBlockInput } from "../services/patchEngine";
import { resolveShouldCommit } from "../services/applyPatchService";
import { runApplyPipeline } from "../services/applyPipeline";
import { createStageRunner } from "../utils/streamProgress";

export const patchRouter = Router();

interface ApplyRequestBody {
  blocks: DiffBlockInput[];
  commitMessage?: string;
  skipCommit?: boolean;
  commit?: boolean;
  dryRun?: boolean;
}

patchRouter.post("/apply", async (req: Request, res: Response) => {
  const {
    blocks,
    commitMessage,
    skipCommit,
    commit,
    dryRun,
  }: ApplyRequestBody = req.body;
  const shouldCommit = resolveShouldCommit(commit, skipCommit);
  const isDryRun = dryRun === true;
  const targetRepoPath = repoState.getRepoPath();

  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return res
      .status(400)
      .json({ success: false, error: "No diff blocks provided." });
  }

  // Streamed as newline-delimited JSON: one "progress" line per stage,
  // then a final "result" line. Once res.write() is called the status
  // code is locked at 200 — success/failure now lives entirely in the
  // "result" line's `success` field, not the HTTP status.
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const stageRunner = createStageRunner(res);

  await runApplyPipeline(
    targetRepoPath,
    blocks,
    { isDryRun, shouldCommit, commitMessage },
    stageRunner,
  );

  res.end();
});

patchRouter.post("/undo", (_req: Request, res: Response) => {
  try {
    const targetRepoPath = repoState.getRepoPath();
    gitUndo(targetRepoPath);
    res.json({
      success: true,
      message: "Hard reset to previous commit successful!",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});
