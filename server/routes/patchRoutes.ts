import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import {
  repoState,
  gitSnapshotPreEdit,
  gitMoveFile,
  formatFile,
  gitCommit,
  gitUndo,
} from "../adapters/gitAdapter";
import {
  applyBlockToContent,
  validateSyntax,
  DiffBlockInput,
} from "../services/patchEngine";

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
  const shouldCommit = commit === true || (commit !== false && !skipCommit);
  const isDryRun = dryRun === true;
  const targetRepoPath = repoState.getRepoPath();

  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return res
      .status(400)
      .json({ success: false, error: "No diff blocks provided." });
  }

  const moveBlocks = blocks.filter((b) => b.type === "move");
  const editBlocks = blocks.filter((b) => b.type !== "move");

  try {
    if (!isDryRun) {
      gitSnapshotPreEdit(targetRepoPath);
    }

    const pendingWrites = new Map<string, string>();
    const validationErrors: string[] = [];

    for (const block of editBlocks) {
      if (!block.file || block.file === "Active File") continue;
      const fullPath = path.resolve(targetRepoPath, block.file);

      let currentContent = pendingWrites.get(block.file);
      const fileExists = fs.existsSync(fullPath);

      if (currentContent === undefined) {
        currentContent = fileExists ? fs.readFileSync(fullPath, "utf-8") : "";
      }

      const result = applyBlockToContent(currentContent, block);
      if (result.success && result.newContent !== undefined) {
        const syntaxError = validateSyntax(result.newContent, block.file);
        if (syntaxError) {
          validationErrors.push(syntaxError);
        } else {
          pendingWrites.set(block.file, result.newContent);
        }
      } else {
        if (result.error) {
          validationErrors.push(result.error);
        }
      }
    }

    for (const block of moveBlocks) {
      if (!block.file || !block.moveTo) {
        validationErrors.push(
          "Invalid MOVE block: missing source or destination path.",
        );
        continue;
      }
      const sourcePath = path.resolve(targetRepoPath, block.file);
      const destPath = path.resolve(targetRepoPath, block.moveTo);

      if (!fs.existsSync(sourcePath)) {
        validationErrors.push(
          `MOVE failed: source file not found: ${block.file}`,
        );
      } else if (fs.existsSync(destPath) && sourcePath !== destPath) {
        validationErrors.push(
          `MOVE failed: destination already exists: ${block.moveTo}`,
        );
      }
    }

    if (validationErrors.length > 0) {
      const detailedMsg =
        `Transaction aborted. ${validationErrors.length} validation/syntax error(s) detected:\n` +
        validationErrors.map((err) => `• ${err}`).join("\n") +
        "\n\n0 files were modified on disk.";

      return res.status(422).json({
        success: false,
        error: detailedMsg,
        details: validationErrors,
      });
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

    const CRITICAL_FILES = [
      "server/index.ts",
      "server.ts",
      "server.js",
      "package.json",
      "vite.config.ts",
      "tsconfig.json",
    ];
    const filesToCommit = Array.from(pendingWrites.keys()).sort((a, b) => {
      const isACritical = CRITICAL_FILES.some((f) => a.endsWith(f));
      const isBCritical = CRITICAL_FILES.some((f) => b.endsWith(f));
      if (isACritical && !isBCritical) return 1;
      if (!isACritical && isBCritical) return -1;
      return 0;
    });

    for (const file of filesToCommit) {
      const fullPath = path.resolve(targetRepoPath, file);
      const dirPath = path.dirname(fullPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      const contentToWrite = pendingWrites.get(file);
      if (contentToWrite !== undefined) {
        fs.writeFileSync(fullPath, contentToWrite, "utf-8");
      }
    }

    const movedFiles: string[] = [];
    for (const block of moveBlocks) {
      if (!block.moveTo) continue;
      gitMoveFile(targetRepoPath, block.file, block.moveTo);
      movedFiles.push(block.moveTo);
    }

    const allChangedFiles = [...filesToCommit, ...movedFiles];

    for (const file of allChangedFiles) {
      formatFile(targetRepoPath, file);
    }

    if (shouldCommit) {
      const msg =
        commitMessage && commitMessage.trim()
          ? commitMessage.trim()
          : "ai-edit: updated files";
      gitCommit(targetRepoPath, msg);
    }

    res.json({
      success: true,
      message: shouldCommit
        ? "✅ Transaction complete: Edits applied, formatted & committed to Git!"
        : "✅ Transaction complete: Edits applied to disk!",
      appliedFiles: allChangedFiles,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
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
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});