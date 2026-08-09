import { Router, Request, Response } from "express";
import { gitSnapshotPreEdit, repoState, gitUndo } from "../adapters/gitAdapter";
import { DiffBlockInput } from "../services/patchEngine";
import {
  resolveEditWrites,
  validateMoveBlocks,
  sortFilesForCommit,
  writeFilesToDisk,
  applyMoveBlocks,
  formatChangedFiles,
  commitChanges,
  buildValidationErrorResponse,
  buildApplySuccessMessage,
  resolveShouldCommit,
} from "../services/applyPatchService";

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
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");

  const emit = (event: Record<string, unknown>) => {
    res.write(JSON.stringify(event) + "\n");
  };

  const runStage = async <T>(
    stage: string,
    label: string,
    fn: () => T | Promise<T>,
  ): Promise<T> => {
    emit({ type: "progress", stage, label, status: "start" });
    const startedAt = Date.now();
    try {
      const result = await fn();
      emit({
        type: "progress",
        stage,
        label,
        status: "done",
        durationMs: Date.now() - startedAt,
      });
      return result;
    } catch (err) {
      emit({
        type: "progress",
        stage,
        label,
        status: "error",
        durationMs: Date.now() - startedAt,
      });
      throw err;
    }
  };

  const moveBlocks = blocks.filter((b) => b.type === "move");
  const editBlocks = blocks.filter((b) => b.type !== "move");

  try {
    if (!isDryRun) {
      await runStage("snapshot", "Snapshotting repo state", () =>
        gitSnapshotPreEdit(targetRepoPath),
      );
    }

    const { pendingWrites, validationErrors: editErrors } = await runStage(
      "validate",
      "Validating & linting changed files",
      () => resolveEditWrites(targetRepoPath, editBlocks),
    );
    const moveErrors = await runStage(
      "validate-moves",
      "Checking move targets",
      () => validateMoveBlocks(targetRepoPath, moveBlocks),
    );
    const validationErrors = [...editErrors, ...moveErrors];

    if (validationErrors.length > 0) {
      emit({
        type: "result",
        success: false,
        ...buildValidationErrorResponse(validationErrors),
      });
      return res.end();
    }

    if (isDryRun) {
      emit({
        type: "result",
        success: true,
        dryRun: true,
        message: "✅ Pre-flight validation passed. No files were modified.",
        validatedFiles: Array.from(pendingWrites.keys()),
        validatedMoves: moveBlocks.map((b) => `${b.file} -> ${b.moveTo}`),
      });
      return res.end();
    }

    const filesToCommit = sortFilesForCommit(Array.from(pendingWrites.keys()));
    await runStage("write", "Writing files to disk", () =>
      writeFilesToDisk(targetRepoPath, filesToCommit, pendingWrites),
    );

    const movedFiles = await runStage("move", "Applying file moves", () =>
      applyMoveBlocks(targetRepoPath, moveBlocks),
    );
    const allChangedFiles = [...filesToCommit, ...movedFiles];

    await runStage("format", "Formatting changed files", () =>
      formatChangedFiles(targetRepoPath, allChangedFiles),
    );
    await runStage(
      "commit",
      shouldCommit ? "Committing to Git" : "Skipping commit",
      () => commitChanges(targetRepoPath, shouldCommit, commitMessage),
    );

    emit({
      type: "result",
      success: true,
      message: buildApplySuccessMessage(shouldCommit),
      appliedFiles: allChangedFiles,
    });
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    emit({ type: "result", success: false, error: message });
    res.end();
  }
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
