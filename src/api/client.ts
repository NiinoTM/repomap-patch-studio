import { DiffBlock, HistoryLog } from "../types";

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

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok && !data.error) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return data as T;
}

export const repoApi = {
  fetchRepo: (): Promise<RepoContextResponse> =>
    fetch("/api/repo").then(handleResponse<RepoContextResponse>),

  changeRepo: (newPath: string): Promise<RepoContextResponse> =>
    fetch("/api/repo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPath }),
    }).then(handleResponse<RepoContextResponse>),

  openFolderDialog: (): Promise<FolderDialogResponse> =>
    fetch("/api/native-folder-dialog", {
      method: "POST",
    }).then(handleResponse<FolderDialogResponse>),
};

export const filesApi = {
  fetchFiles: (files: string[]): Promise<FilesResponse> =>
    fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    }).then(handleResponse<FilesResponse>),
};

export const historyApi = {
  fetchHistory: (): Promise<HistoryResponse> =>
    fetch("/api/history").then(handleResponse<HistoryResponse>),
};

export const patchApi = {
  apply: (payload: ApplyPayload): Promise<ApplyResponse> =>
    fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handleResponse<ApplyResponse>),

  undo: (): Promise<UndoResponse> =>
    fetch("/api/undo", {
      method: "POST",
    }).then(handleResponse<UndoResponse>),
};

export const api = {
  getRepo: repoApi.fetchRepo,
  changeRepo: repoApi.changeRepo,
  getFiles: filesApi.fetchFiles,
  getHistory: historyApi.fetchHistory,
  openFolderDialog: repoApi.openFolderDialog,
  undo: patchApi.undo,
  apply: patchApi.apply,
};