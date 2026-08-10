import { DiffBlock, HistoryLog } from "./patch";

export interface RepoContextResponse {
  success: boolean;
  path: string;
  files: string[];
  repoMap: string;
  fileStats: Record<string, { size: number; tokens: number }>;
  dependencyMap: {
    outbound: Record<string, string[]>;
    inbound: Record<string, string[]>;
    apiOutbound?: Record<string, string[]>;
    apiInbound?: Record<string, string[]>;
  };
  branch?: string;
  branches?: string[];
  isClean?: boolean;
  error?: string;
}

export interface FilesResponse {
  success: boolean;
  contents: Record<string, string>;
  error?: string;
}

export interface HistoryResponse {
  success: boolean;
  logs: HistoryLog[];
  error?: string;
}

export interface FolderDialogResponse {
  success: boolean;
  path: string;
  error?: string;
}

export interface UndoResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ApplyPayload {
  blocks: DiffBlock[];
  commitMessage?: string;
  skipCommit?: boolean;
  commit?: boolean;
  dryRun?: boolean;
}

export interface ApplyResponse {
  success: boolean;
  message?: string;
  error?: string;
  details?: string[];
  dryRun?: boolean;
  validatedFiles?: string[];
  validatedMoves?: string[];
  appliedFiles?: string[];
}

export interface ApplyProgressEvent {
  type: "progress";
  stage: string;
  label: string;
  status: "start" | "done" | "error";
  durationMs?: number;
}
