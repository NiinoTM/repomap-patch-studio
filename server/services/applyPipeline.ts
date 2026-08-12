import { gitSnapshotPreEdit } from "../adapters/gitAdapter";
import { StageRunner } from "../utils/streamProgress";
import { DiffBlockInput } from "./patchEngine";
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
} from "./applyPatchService";

// Owns the apply sequence — which stages run, in what order, and what
// happens on validation failure vs. dry-run vs. success. Kept separate
// from applyPatchService.ts (the low-level primitives this calls) so
// neither file grows into a god-file.
export interface ApplyPipelineOptions {
  isDryRun: boolean;
  shouldCommit: boolean;
  commitMessage?: string;
}

export async function runApplyPipeline(
  targetRepoPath: string,
  blocks: DiffBlockInput[],
  options: ApplyPipelineOptions,
  { emit, runStage }: StageRunner,
): Promise<void> {
  const { isDryRun, shouldCommit, commitMessage } = options;
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
      return;
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
      return;
    }

    const filesToCommit = sortFilesForCommit(Array.from(pendingWrites.keys()));
    await runStage("write", "Writing files to disk", () =>
      writeFilesToDisk(targetRepoPath, filesToCommit, pendingWrites),
    );

    const movedFiles = await runStage("move", "Applying file moves", () =>
      applyMoveBlocks(targetRepoPath, moveBlocks),
    );
    const allChangedFiles = [...filesToCommit, ...movedFiles];

    if (shouldCommit) {
      await runStage("format", "Formatting changed files", () =>
        formatChangedFiles(targetRepoPath, allChangedFiles),
      );
    }
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    emit({ type: "result", success: false, error: message });
  }
}
