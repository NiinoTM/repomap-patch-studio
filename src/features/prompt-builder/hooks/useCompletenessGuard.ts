import { useState, useEffect } from "react";
import {
  findMissingDependencies,
  MissingDependency,
} from "../utils/completenessCheck";

interface UseCompletenessGuardParams {
  selectedFiles: Set<string>;
  dependencyMap?: {
    outbound: Record<string, string[]>;
    inbound: Record<string, string[]>;
    apiOutbound?: Record<string, string[]>;
    apiInbound?: Record<string, string[]>;
  };
  discoveryMode: boolean;
  copyFullContext: () => void;
  copyFilesAndPrompt: () => void;
  copyUnitTestPrompt: () => void;
  acceptAllSuggestions: (files: string[]) => void;
}

export function useCompletenessGuard({
  selectedFiles,
  dependencyMap,
  discoveryMode,
  copyFullContext,
  copyFilesAndPrompt,
  copyUnitTestPrompt,
  acceptAllSuggestions,
}: UseCompletenessGuardParams) {
  const [missingDependencies, setMissingDependencies] = useState<
    MissingDependency[]
  >([]);
  const [pendingCopyAction, setPendingCopyAction] = useState<
    "full" | "files" | "tests" | null
  >(null);
  const [autoConfirmCopy, setAutoConfirmCopy] = useState(false);

  const executeCopyAction = (action: "full" | "files" | "tests") => {
    if (action === "full") copyFullContext();
    else if (action === "files") copyFilesAndPrompt();
    else if (action === "tests") copyUnitTestPrompt();
  };

  useEffect(() => {
    if (!pendingCopyAction || !autoConfirmCopy) return;
    executeCopyAction(pendingCopyAction);
    setPendingCopyAction(null);
    setAutoConfirmCopy(false);
    setMissingDependencies([]);
  }, [selectedFiles]);

  const handleCopyClick = (action: "full" | "files" | "tests") => {
    if (discoveryMode) {
      copyFullContext();
      return;
    }
    const missing = findMissingDependencies(selectedFiles, dependencyMap);
    if (missing.length > 0) {
      setMissingDependencies(missing);
      setPendingCopyAction(action);
      return;
    }
    executeCopyAction(action);
  };

  const handleAddMissingAndCopy = () => {
    acceptAllSuggestions(missingDependencies.map((dep) => dep.filePath));
    setAutoConfirmCopy(true);
  };

  const handleCopyAnyway = () => {
    if (pendingCopyAction) executeCopyAction(pendingCopyAction);
    setPendingCopyAction(null);
    setMissingDependencies([]);
  };

  const handleCancelCompletenessWarning = () => {
    setPendingCopyAction(null);
    setMissingDependencies([]);
  };

  return {
    missingDependencies,
    pendingCopyAction,
    handleCopyClick,
    handleAddMissingAndCopy,
    handleCopyAnyway,
    handleCancelCompletenessWarning,
  };
}