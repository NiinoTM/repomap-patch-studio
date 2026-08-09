import {
  fileExists,
  readTextFile,
  writeTextFile,
  ensureDir,
  resolvePath,
  dirnamePath,
} from "../adapters/fsAdapter";
import { gitMoveFile, formatFile, gitCommit } from "../adapters/gitAdapter";
import {
  applyBlocksSequentially,
  validateSyntax,
  DiffBlockInput,
} from "./patchEngine";
import { validateLint } from "./lintService";

const CRITICAL_FILES = [
  "server/index.ts",
  "server.ts",
  "server.js",
  "package.json",
  "vite.config.ts",
  "tsconfig.json",
];

export interface ApplyEditsResult {
  pendingWrites: Map<string, string>;
  validationErrors: string[];
}

export async function resolveEditWrites(
  targetRepoPath: string,
  editBlocks: DiffBlockInput[],
): Promise<ApplyEditsResult> {
  const pendingWrites = new Map<string, string>();
  const validationErrors: string[] = [];

  // Group blocks by target file, preserving submission order, so every
  // block for a file is folded onto one running buffer instead of each
  // being matched independently against stale on-disk content.
  const blocksByFile = new Map<string, DiffBlockInput[]>();
  for (const block of editBlocks) {
    if (!block.file || block.file === "Active File") continue;
    const existing = blocksByFile.get(block.file);
    if (existing) {
      existing.push(block);
    } else {
      blocksByFile.set(block.file, [block]);
    }
  }

  // No short-circuiting across files: every file in the transaction gets
  // fully checked (block application + syntax + lint) so one bad file
  // never hides problems in another, and the caller gets every error in
  // a single aggregated report instead of one-at-a-time round trips.
  for (const [file, blocks] of blocksByFile) {
    const fullPath = resolvePath(targetRepoPath, file);
    const initialContent = fileExists(fullPath) ? readTextFile(fullPath) : "";

    const { finalContent, blockErrors } = applyBlocksSequentially(
      initialContent,
      blocks,
    );

    if (blockErrors.length > 0) {
      validationErrors.push(...blockErrors);
      continue;
    }

    const syntaxError = validateSyntax(finalContent, file);
    if (syntaxError) {
      validationErrors.push(syntaxError);
      continue;
    }

    const lintErrors = await validateLint(targetRepoPath, finalContent, file);
    if (lintErrors.length > 0) {
      validationErrors.push(...lintErrors);
      continue;
    }

    pendingWrites.set(file, finalContent);
  }

  return { pendingWrites, validationErrors };
}

export function validateMoveBlocks(
  targetRepoPath: string,
  moveBlocks: DiffBlockInput[],
): string[] {
  const errors: string[] = [];

  for (const block of moveBlocks) {
    if (!block.file || !block.moveTo) {
      errors.push("Invalid MOVE block: missing source or destination path.");
      continue;
    }
    const sourcePath = resolvePath(targetRepoPath, block.file);
    const destPath = resolvePath(targetRepoPath, block.moveTo);

    if (!fileExists(sourcePath)) {
      errors.push(`MOVE failed: source file not found: ${block.file}`);
    } else if (fileExists(destPath) && sourcePath !== destPath) {
      errors.push(`MOVE failed: destination already exists: ${block.moveTo}`);
    }
  }

  return errors;
}

export function sortFilesForCommit(files: string[]): string[] {
  return [...files].sort((a, b) => {
    const isACritical = CRITICAL_FILES.some((f) => a.endsWith(f));
    const isBCritical = CRITICAL_FILES.some((f) => b.endsWith(f));
    if (isACritical && !isBCritical) return 1;
    if (!isACritical && isBCritical) return -1;
    return 0;
  });
}

export function writeFilesToDisk(
  targetRepoPath: string,
  filesToCommit: string[],
  pendingWrites: Map<string, string>,
): void {
  for (const file of filesToCommit) {
    const fullPath = resolvePath(targetRepoPath, file);
    ensureDir(dirnamePath(fullPath));
    const contentToWrite = pendingWrites.get(file);
    if (contentToWrite !== undefined) {
      writeTextFile(fullPath, contentToWrite);
    }
  }
}

export function applyMoveBlocks(
  targetRepoPath: string,
  moveBlocks: DiffBlockInput[],
): string[] {
  const movedFiles: string[] = [];
  for (const block of moveBlocks) {
    if (!block.moveTo) continue;
    gitMoveFile(targetRepoPath, block.file, block.moveTo);
    movedFiles.push(block.moveTo);
  }
  return movedFiles;
}

export function formatChangedFiles(
  targetRepoPath: string,
  files: string[],
): void {
  for (const file of files) {
    formatFile(targetRepoPath, file);
  }
}

export function commitChanges(
  targetRepoPath: string,
  shouldCommit: boolean,
  commitMessage: string | undefined,
): void {
  if (!shouldCommit) return;
  const msg =
    commitMessage && commitMessage.trim()
      ? commitMessage.trim()
      : "ai-edit: updated files";
  gitCommit(targetRepoPath, msg);
}

export interface ValidationErrorResponse {
  error: string;
  details: string[];
}

export function buildValidationErrorResponse(
  validationErrors: string[],
): ValidationErrorResponse {
  const detailedMsg =
    `Transaction aborted. ${validationErrors.length} validation/syntax error(s) detected:\n` +
    validationErrors.map((err) => `• ${err}`).join("\n") +
    "\n\n0 files were modified on disk.";
  return { error: detailedMsg, details: validationErrors };
}

export function buildApplySuccessMessage(shouldCommit: boolean): string {
  return shouldCommit
    ? "✅ Transaction complete: Edits applied, formatted & committed to Git!"
    : "✅ Transaction complete: Edits applied to disk!";
}

export function resolveShouldCommit(
  commit: boolean | undefined,
  skipCommit: boolean | undefined,
): boolean {
  return commit === true || (commit !== false && !skipCommit);
}
