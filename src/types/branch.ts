export interface BranchDetails {
  name: string;
  isCurrent: boolean;
  commitHash: string;
  commitMessage: string;
  upstream?: string;
}

export interface BranchListResponse {
  success: boolean;
  currentBranch: string;
  branches: BranchDetails[];
  isClean: boolean;
  error?: string;
}

export interface SwitchBranchRequest {
  branch: string;
  stash?: boolean;
}

export interface CreateBranchRequest {
  name: string;
  startPoint?: string;
}

export interface RenameBranchRequest {
  oldName: string;
  newName: string;
}

export interface DeleteBranchRequest {
  branch: string;
  force?: boolean;
}

export interface ActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}
