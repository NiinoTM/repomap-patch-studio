import { Router, Request, Response } from "express";
import { z } from "zod";
import { repoState, gitUndo } from "../adapters/gitAdapter";
import { DiffBlockInput } from "../services/patchEngine";
import { resolveShouldCommit } from "../services/applyPatchService";
import { runApplyPipeline } from "../services/applyPipeline";
import { createStageRunner } from "../utils/streamProgress";

export const patchRouter = Router();

const applyRequestBodySchema = z.object({
  blocks: z.array(z.any()).optional().default([]),
  commitMessage: z.string().optional(),
  skipCommit: z.boolean().optional(),
  commit: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  force: z.boolean().optional(),
});

type ApplyRequestBody = z.infer<typeof applyRequestBodySchema>;

patchRouter.post("/apply", async (req: Request, res: Response) => {
  const parseResult = applyRequestBodySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid request payload: " + parseResult.error.message });
  }

  const {
    blocks,
    commitMessage,
    skipCommit,
    commit,
    dryRun,
    force,
  }: ApplyRequestBody = parseResult.data;
  const shouldCommit = resolveShouldCommit(commit, skipCommit);
  const isDryRun = dryRun === true;
  const isForce = force === true;
  const targetRepoPath = repoState.getRepoPath();

  if (
    !blocks ||
    !Array.isArray(blocks) ||
    (blocks.length === 0 && !shouldCommit)
  ) {
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
    blocks as DiffBlockInput[],
    { isDryRun, shouldCommit, commitMessage, force: isForce },
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
