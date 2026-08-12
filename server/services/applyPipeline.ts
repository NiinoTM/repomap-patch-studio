import { getDirtyFiles } from "../adapters/gitAdapter";
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

async function validatePipeline(
  targetRepoPath: string,
  editBlocks: DiffBlockInput[],
  moveBlocks: DiffBlockInput[],
  runStage: StageRunner["runStage"],
) {
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
  return {
    pendingWrites,
    validationErrors: [...editErrors, ...moveErrors],
  };
}

function emitDryRunResult(
  pendingWrites: Map<string, string>,
  moveBlocks: DiffBlockInput[],
  emit: StageRunner["emit"],
) {
  emit({
    type: "result",
    success: true,
    dryRun: true,
    message: "✅ Pre-flight validation passed. No files were modified.",
    validatedFiles: Array.from(pendingWrites.keys()),
    validatedMoves: moveBlocks.map((b) => `${b.file} -> ${b.moveTo}`),
  });
}

async function executeApplyWrites(
  targetRepoPath: string,
  pendingWrites: Map<string, string>,
  moveBlocks: DiffBlockInput[],
  options: { shouldCommit: boolean; commitMessage?: string },
  runStage: StageRunner["runStage"],
): Promise<string[]> {
  const { shouldCommit, commitMessage } = options;
  const filesToCommit = sortFilesForCommit(Array.from(pendingWrites.keys()));
  await runStage("write", "Writing files to disk", () =>
    writeFilesToDisk(targetRepoPath, filesToCommit, pendingWrites),
  );

  const movedFiles = await runStage("move", "Applying file moves", () =>
    applyMoveBlocks(targetRepoPath, moveBlocks),
  );
  const allChangedFiles = [...filesToCommit, ...movedFiles];

  if (shouldCommit) {
    const dirtyFiles = getDirtyFiles(targetRepoPath);
    const filesToFormat = Array.from(
      new Set([...allChangedFiles, ...dirtyFiles]),
    );

    await runStage("format", "Formatting changed files", () =>
      formatChangedFiles(targetRepoPath, filesToFormat),
    );
  }
  await runStage(
    "commit",
    shouldCommit ? "Committing to Git" : "Skipping commit",
    () => commitChanges(targetRepoPath, shouldCommit, commitMessage),
  );

  return allChangedFiles;
}

export async function runApplyPipeline(
  targetRepoPath: string,
  blocks: DiffBlockInput[],
  options: ApplyPipelineOptions,
  runner: StageRunner,
): Promise<void> {
  const { isDryRun, shouldCommit, commitMessage } = options;
  const { emit, runStage } = runner;
  const moveBlocks = blocks.filter((b) => b.type === "move");
  const editBlocks = blocks.filter((b) => b.type !== "move");

  try {
    const { pendingWrites, validationErrors } = await validatePipeline(
      targetRepoPath,
      editBlocks,
      moveBlocks,
      runStage,
    );
    if (validationErrors.length > 0) {
      emit({
        type: "result",
        success: false,
        ...buildValidationErrorResponse(validationErrors),
      });
      return;
    }

    if (isDryRun) {
      emitDryRunResult(pendingWrites, moveBlocks, emit);
      return;
    }

    const appliedFiles = await executeApplyWrites(
      targetRepoPath,
      pendingWrites,
      moveBlocks,
      { shouldCommit, commitMessage },
      runStage,
    );
    emit({
      type: "result",
      success: true,
      message: buildApplySuccessMessage(shouldCommit),
      appliedFiles,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    emit({ type: "result", success: false, error });
  }
}
