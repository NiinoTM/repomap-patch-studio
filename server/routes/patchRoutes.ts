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
  resolveShouldCommit
} from "../services/applyPatchService";

export const patchRouter = Router();

interface ApplyRequestBody {
  blocks: DiffBlockInput[];
  commitMessage?: string;
  skipCommit?: boolean;
  commit?: boolean;
  dryRun?: boolean;
}

patchRouter.post("/apply", (req: Request, res: Response) => {
  const { blocks, commitMessage, skipCommit, commit, dryRun }: ApplyRequestBody = req.body;
  const shouldCommit = resolveShouldCommit(commit, skipCommit);
  const isDryRun = dryRun === true;
  const targetRepoPath = repoState.getRepoPath();

  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return res.status(400).json({ success: false, error: "No diff blocks provided." });
  }

  const moveBlocks = blocks.filter((b) => b.type === "move");
  const editBlocks = blocks.filter((b) => b.type !== "move");

  try {
    if (!isDryRun) {
      gitSnapshotPreEdit(targetRepoPath);
    }

    const { pendingWrites, validationErrors: editErrors } = resolveEditWrites(targetRepoPath, editBlocks);
    const moveErrors = validateMoveBlocks(targetRepoPath, moveBlocks);
    const validationErrors = [...editErrors, ...moveErrors];

    if (validationErrors.length > 0) {
      return res.status(422).json({ success: false, ...buildValidationErrorResponse(validationErrors) });
    }

    if (isDryRun) {
      return res.json({
        success: true,
        dryRun: true,
        message: "✅ Pre-flight validation passed. No files were modified.",
        validatedFiles: Array.from(pendingWrites.keys()),
        validatedMoves: moveBlocks.map((b) => `${b.file} -> ${b.moveTo}`),
      });
    }

    const filesToCommit = sortFilesForCommit(Array.from(pendingWrites.keys()));
    writeFilesToDisk(targetRepoPath, filesToCommit, pendingWrites);

    const movedFiles = applyMoveBlocks(targetRepoPath, moveBlocks);
    const allChangedFiles = [...filesToCommit, ...movedFiles];

    formatChangedFiles(targetRepoPath, allChangedFiles);
    commitChanges(targetRepoPath, shouldCommit, commitMessage);

    res.json({
      success: true,
      message: buildApplySuccessMessage(shouldCommit),
      appliedFiles: allChangedFiles,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

patchRouter.post("/undo", (_req: Request, res: Response) => {
  try {
    const targetRepoPath = repoState.getRepoPath();
    gitUndo(targetRepoPath);
    res.json({ success: true, message: "Hard reset to previous commit successful!" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

patchRouter.post("/undo", (_req: Request, res: Response) => {
  try {
    const targetRepoPath = repoState.getRepoPath();
    gitUndo(targetRepoPath);
    res.json({ success: true, message: "Hard reset to previous commit successful!" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});