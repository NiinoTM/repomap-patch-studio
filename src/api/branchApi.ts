import { handleResponse } from "./client";
import {
  BranchListResponse,
  SwitchBranchRequest,
  CreateBranchRequest,
  RenameBranchRequest,
  DeleteBranchRequest,
  ActionResponse,
} from "../types/branch";

export const branchApi = {
  fetchBranches: (): Promise<BranchListResponse> =>
    fetch("/api/branches").then(handleResponse<BranchListResponse>),

  switchBranch: (payload: SwitchBranchRequest): Promise<ActionResponse> =>
    fetch("/api/branches/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handleResponse<ActionResponse>),

  createBranch: (payload: CreateBranchRequest): Promise<ActionResponse> =>
    fetch("/api/branches/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handleResponse<ActionResponse>),

  renameBranch: (payload: RenameBranchRequest): Promise<ActionResponse> =>
    fetch("/api/branches/rename", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handleResponse<ActionResponse>),

  deleteBranch: (payload: DeleteBranchRequest): Promise<ActionResponse> =>
    fetch("/api/branches/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handleResponse<ActionResponse>),
};
