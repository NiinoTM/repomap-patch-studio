import { getDirtyFiles } from "../adapters/gitAdapter";
import { StageRunner } from "../utils/streamProgress";
import { DiffBlockInput } from "./patchEngine";
import { ensureGitRepository } from "../adapters/packageManagerAdapter";
import { clearLinterCache } from "./lintService";
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
  force?: boolean;
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
  warnings: string[] = [],
) {
  emit({
    type: "result",
    success: true,
    dryRun: true,
    message:
      warnings.length > 0
        ? `⚠️ Pre-flight validation passed with ${warnings.length} warning(s). No files were modified.`
        : "✅ Pre-flight validation passed. No files were modified.",
    validatedFiles: Array.from(pendingWrites.keys()),
    validatedMoves: moveBlocks.map((b) => `${b.file} -> ${b.moveTo}`),
    details: warnings.length > 0 ? warnings : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  });
}

function logDiskWriteSummary(
  targetRepoPath: string,
  filesToCommit: string[],
  pendingWrites: Map<string, string>,
) {
  console.log(`\n[ApplyPipeline] Target repo: "${targetRepoPath}"`);
  console.log(`[ApplyPipeline] Writing ${filesToCommit.length} file(s) to disk:`, filesToCommit);
  if (filesToCommit.length === 0) {
    console.warn(`[ApplyPipeline] ⚠️ WARNING: filesToCommit is EMPTY (${pendingWrites.size} in pendingWrites).`);
  }
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
  logDiskWriteSummary(targetRepoPath, filesToCommit, pendingWrites);

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

  console.log(`[ApplyPipeline] Applied files:`, allChangedFiles);
  return allChangedFiles;
}

function isNonBreakingError(err: string): boolean {
  return err.length >= 0;
}

function checkHardErrors(errors: string[]): boolean {
  return errors.some((err) => !isNonBreakingError(err));
}

function buildPipelineAutoHealPrompt(
  errors: string[],
  blocks: DiffBlockInput[],
): string {
  const searchMarker = "<".repeat(7) + " SEARCH";
  const equalsMarker = "=".repeat(7);
  const replaceMarker = ">".repeat(7) + " REPLACE";

  const formattedErrors = errors.map((e, i) => `${i + 1}. ${e}`).join("\n");
  const formattedBlocks = blocks
    .map(
      (b) =>
        `FILE: ${b.file}\n${searchMarker}\n${b.search}\n${equalsMarker}\n${b.replace}\n${replaceMarker}`,
    )
    .join("\n\n");

  return `ROLE: Senior Software Architect & Healing Engineer\nPlease fix the following patch validation failures:\n\nERRORS:\n${formattedErrors}\n\nFAILED PATCH BLOCKS:\n${formattedBlocks}\n\nEmit updated, corrected SEARCH/REPLACE blocks.`;
}

function emitApplySuccess(
  emit: StageRunner["emit"],
  appliedFiles: string[],
  shouldCommit: boolean,
  validationErrors: string[],
) {
  const warnings = validationErrors.length > 0 ? validationErrors : undefined;
  emit({
    type: "result",
    success: true,
    message: buildApplySuccessMessage(shouldCommit),
    appliedFiles,
    details: warnings,
    warnings,
  });
}

function logPipelineDetails(
  targetRepoPath: string,
  blocks: DiffBlockInput[],
  pendingWrites: Map<string, string>,
  validationErrors: string[],
) {
  console.log(`\n[ApplyPipeline] Target: "${targetRepoPath}" | Blocks: ${blocks.length}`);
  blocks.forEach((b, i) => {
    console.log(`  [Block ${i + 1}] ${b.file} (${b.type || "edit"}) search:${b.search?.length ?? 0} replace:${b.replace?.length ?? 0}`);
  });
  console.log(`[ApplyPipeline] Pending writes (${pendingWrites.size}):`, Array.from(pendingWrites.keys()));
  if (validationErrors.length > 0) {
    console.log(`[ApplyPipeline] Validation notes (${validationErrors.length}):`, validationErrors);
  }
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

  clearLinterCache();

  try {
    await ensureGitRepository(targetRepoPath);

    const { pendingWrites, validationErrors } = await validatePipeline(
      targetRepoPath,
      editBlocks,
      moveBlocks,
      runStage,
    );
    logPipelineDetails(targetRepoPath, blocks, pendingWrites, validationErrors);

    if (!options.force && checkHardErrors(validationErrors)) {
      const autoHealPrompt = buildPipelineAutoHealPrompt(validationErrors, blocks);
      emit({
        type: "result",
        success: false,
        ...buildValidationErrorResponse(validationErrors),
        autoHealPrompt,
      });
      return;
    }

    if (isDryRun) {
      console.log(`[ApplyPipeline] isDryRun=true (validation only, skipping write)`);
      emitDryRunResult(pendingWrites, moveBlocks, emit, validationErrors);
      return;
    }

    const appliedFiles = await executeApplyWrites(
      targetRepoPath,
      pendingWrites,
      moveBlocks,
      { shouldCommit, commitMessage },
      runStage,
    );
    emitApplySuccess(emit, appliedFiles, shouldCommit, validationErrors);
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[ApplyPipeline] Pipeline error:`, error);
    emit({ type: "result", success: false, error });
  }
}
