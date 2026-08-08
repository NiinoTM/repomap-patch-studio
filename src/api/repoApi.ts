import { handleResponse } from "./client";
import {
  RepoContextResponse,
  FolderDialogResponse,
  FilesResponse,
} from "../types/api";

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
