import { Router, Request, Response } from "express";
import { z } from "zod";
import {
  fileExists,
  isDirectory,
  readTextFile,
  joinPath,
  resolvePath,
} from "../adapters/fsAdapter";
import { repoState, getAllFiles, getFileStats } from "../adapters/gitAdapter";
import {
  getGitBranch,
  getGitBranches,
  getGitStatusClean,
} from "../adapters/gitBranchAdapter";
import { branchRouter } from "./branchRoutes";
import { generateRepoMap } from "../services/repoMapService";
import { getDependencyMap } from "../services/dependencyService";
import {
  extractExportContracts,
  extractFileExportContracts,
  extractSymbolBody,
  extractLineRange,
} from "../services/contractExtractorService";
import { openNativeFolderDialog } from "../adapters/osAdapter";
import {
  bootstrapRepository,
  ensureGitRepository,
} from "../adapters/packageManagerAdapter";

export const repoRouter = Router();
repoRouter.use(branchRouter);

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

const boundedReadSchema = z.object({
  repoPath: z.string().optional(),
  filePath: z.string().min(1, "filePath is required"),
  range: z.tuple([z.number(), z.number()]).optional(),
  symbolName: z.string().optional(),
  symbol: z.string().optional(),
  startLine: z.number().optional(),
  endLine: z.number().optional(),
});

type BoundedReadInput = z.infer<typeof boundedReadSchema>;

function resolveTargetRange(input: BoundedReadInput): [number, number] | undefined {
  if (input.range) return [input.range[0], input.range[1]];
  if (typeof input.startLine === "number" && typeof input.endLine === "number") {
    return [input.startLine, input.endLine];
  }
  return undefined;
}

function resolveTargetFullPath(repoPath: string | undefined, filePath: string): string {
  const basePath = repoPath || repoState.getRepoPath() || process.cwd();
  return resolvePath(basePath, filePath);
}

function extractBoundedContent(
  fileText: string,
  filePath: string,
  symbol?: string,
  range?: [number, number],
): string {
  if (symbol) {
    const extracted = extractSymbolBody(fileText, filePath, symbol);
    if (extracted) return extracted;
    const contracts = extractFileExportContracts(fileText, filePath);
    return contracts
      ? `// Symbol "${symbol}" not found in ${filePath}. Returning file export contracts:\n${contracts}`
      : `// Symbol "${symbol}" not found in ${filePath} (no export contracts found).`;
  }
  if (range) {
    return extractLineRange(fileText, range[0], range[1], filePath);
  }
  return fileText;
}

repoRouter.post(
  [
    "/bounded-read",
    "/repo/bounded-read",
    "/inspect-symbol",
    "/repo/inspect-symbol",
    "/read-range",
    "/repo/read-range",
  ],
  (req: Request, res: Response) => {
    const parsed = boundedReadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(", "),
      });
      return;
    }

    const { repoPath, filePath, symbolName, symbol } = parsed.data;
    const targetSymbol = symbolName || symbol;
    const targetRange = resolveTargetRange(parsed.data);
    const fullPath = resolveTargetFullPath(repoPath, filePath);

    if (!fileExists(fullPath) || isDirectory(fullPath)) {
      res.status(404).json({ success: false, error: `File not found: ${filePath}` });
      return;
    }

    try {
      const fileText = readTextFile(fullPath);
      const content = extractBoundedContent(fileText, filePath, targetSymbol, targetRange);

      res.json({
        success: true,
        content,
        linesCount: content.split(/\r?\n/).length,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: message });
    }
  },
);
