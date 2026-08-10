import { useState, useEffect, useCallback } from "react";
import { branchApi } from "../../../api/branchApi";
import { BranchDetails } from "../../../types/branch";

interface UseBranchManagerParams {
  onBranchChange?: () => void;
}

export function useBranchManager({
  onBranchChange,
}: UseBranchManagerParams = {}) {
  const [branches, setBranches] = useState<BranchDetails[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>("");
  const [isClean, setIsClean] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [branchToRename, setBranchToRename] = useState<string | null>(null);
  const [dirtyTargetBranch, setDirtyTargetBranch] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");

  const refreshBranches = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await branchApi.fetchBranches();
      if (data.success) {
        setBranches(data.branches);
        setCurrentBranch(data.currentBranch);
        setIsClean(data.isClean);
      } else {
        setError(data.error || "Failed to load branch list");
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
      setError("Network error loading branch list");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBranches();
  }, [refreshBranches]);

  const onActionDone = async (closeManager = false) => {
    await refreshBranches();
    onBranchChange?.();
    setDirtyTargetBranch(null);
    if (closeManager) setIsManagerOpen(false);
  };

  const switchBranch = (target: string, force = false) => {
    if (target === currentBranch) return;
    if (!isClean && !force) return setDirtyTargetBranch(target);
    execBranchAction(
      () => branchApi.switchBranch({ branch: target }),
      setIsLoading,
      () => onActionDone(true),
      "Failed to switch branch",
    );
  };

  const stashAndSwitch = () => {
    if (!dirtyTargetBranch) return;
    execBranchAction(
      () => branchApi.switchBranch({ branch: dirtyTargetBranch, stash: true }),
      setIsLoading,
      () => onActionDone(true),
      "Failed to stash and switch",
    );
  };

  const createBranch = (name: string, startPoint?: string) => {
    execBranchAction(
      () => branchApi.createBranch({ name, startPoint }),
      setIsLoading,
      async () => {
        setIsCreateOpen(false);
        await onActionDone(true);
      },
      "Failed to create branch",
    );
  };

  const renameBranch = (oldName: string, newName: string) => {
    execBranchAction(
      () => branchApi.renameBranch({ oldName, newName }),
      setIsLoading,
      async () => {
        setBranchToRename(null);
        await onActionDone();
      },
      "Failed to rename branch",
    );
  };

  const deleteBranch = (branchName: string, force = false) => {
    if (!confirm(`Are you sure you want to delete branch "${branchName}"?`))
      return;
    execBranchAction(
      () => branchApi.deleteBranch({ branch: branchName, force }),
      setIsLoading,
      refreshBranches,
      "Failed to delete branch",
    );
  };

  return {
    branches: branches.filter((b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
    allBranches: branches,
    currentBranch,
    isClean,
    isLoading,
    error,
    isManagerOpen,
    setIsManagerOpen,
    isCreateOpen,
    setIsCreateOpen,
    branchToRename,
    setBranchToRename,
    dirtyTargetBranch,
    setDirtyTargetBranch,
    searchQuery,
    setSearchQuery,
    refreshBranches,
    switchBranch,
    stashAndSwitch,
    createBranch,
    renameBranch,
    deleteBranch,
  };
}

async function execBranchAction(
  apiCall: () => Promise<{ success: boolean; error?: string }>,
  setIsLoading: (l: boolean) => void,
  onSuccess: () => Promise<void> | void,
  errorMessage: string,
) {
  setIsLoading(true);
  try {
    const res = await apiCall();
    if (res.success) {
      await onSuccess();
    } else {
      alert(`${errorMessage}: ${res.error || "Unknown error"}`);
    }
  } catch (err) {
    console.error(err);
    alert(`${errorMessage}. Ensure backend is running.`);
  } finally {
    setIsLoading(false);
  }
}
