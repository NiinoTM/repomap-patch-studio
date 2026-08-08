import { useState, useEffect, useMemo } from "react";

interface UseFileSelectionParams {
  request: string;
  files: string[];
}

// Extracted from PromptPanel.tsx — seedFiles/acceptedSuggestions state and
// every handler that mutates them (selection, folder toggling, suggestion
// accept/reject, syncing @mentions from the request text into seed files).
export function useFileSelection({ request, files }: UseFileSelectionParams) {
  const [seedFiles, setSeedFiles] = useState<Set<string>>(new Set());
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(
    new Set(),
  );

  const selectedFiles = useMemo(() => {
    const combined = new Set<string>(seedFiles);
    acceptedSuggestions.forEach((f) => combined.add(f));
    return combined;
  }, [seedFiles, acceptedSuggestions]);

  const addSeedFile = (filePath: string) => {
    setSeedFiles((prev) => new Set(prev).add(filePath));
  };

  // Keep seedFiles in sync with @mentions typed into the request text.
  useEffect(() => {
    const matches = Array.from(request.matchAll(/@([a-zA-Z0-9_\-./]+)/g));
    const currentMentions = new Set<string>();

    for (const match of matches) {
      const path = match[1];
      if (files.includes(path)) {
        currentMentions.add(path);
      }
    }

    setSeedFiles((prev) => {
      const next = new Set(prev);
      currentMentions.forEach((f) => next.add(f));
      return next;
    });
  }, [request, files]);

  // Reset selection whenever the active repo's file list changes.
  useEffect(() => {
    setSeedFiles(new Set());
    setAcceptedSuggestions(new Set());
  }, [files]);

  const toggleSuggestion = (filePath: string) => {
    if (selectedFiles.has(filePath)) {
      setAcceptedSuggestions((prev) => {
        const next = new Set(prev);
        next.delete(filePath);
        return next;
      });
      setSeedFiles((prev) => {
        const next = new Set(prev);
        next.delete(filePath);
        return next;
      });
    } else {
      setAcceptedSuggestions((prev) => new Set(prev).add(filePath));
    }
  };

  const acceptAllSuggestions = (filePaths: string[]) => {
    setAcceptedSuggestions((prev) => {
      const next = new Set(prev);
      filePaths.forEach((f) => next.add(f));
      return next;
    });
  };

  const selectAll = () => {
    setSeedFiles(new Set(files));
    setAcceptedSuggestions(new Set());
  };

  const deselectAll = () => {
    setSeedFiles(new Set());
    setAcceptedSuggestions(new Set());
  };

  const toggleFile = (filePath: string) => {
    if (selectedFiles.has(filePath)) {
      setSeedFiles((prev) => {
        const next = new Set(prev);
        next.delete(filePath);
        return next;
      });
      setAcceptedSuggestions((prev) => {
        const next = new Set(prev);
        next.delete(filePath);
        return next;
      });
    } else {
      setSeedFiles((prev) => new Set(prev).add(filePath));
    }
  };

  const toggleFolder = (folderFiles: string[], shouldSelect: boolean) => {
    if (!shouldSelect) {
      setSeedFiles((prev) => {
        const next = new Set(prev);
        folderFiles.forEach((f) => next.delete(f));
        return next;
      });
      setAcceptedSuggestions((prev) => {
        const next = new Set(prev);
        folderFiles.forEach((f) => next.delete(f));
        return next;
      });
    } else {
      setSeedFiles((prev) => {
        const next = new Set(prev);
        folderFiles.forEach((f) => next.add(f));
        return next;
      });
    }
  };

  return {
    seedFiles,
    acceptedSuggestions,
    selectedFiles,
    addSeedFile,
    toggleFile,
    toggleFolder,
    selectAll,
    deselectAll,
    toggleSuggestion,
    acceptAllSuggestions,
  };
}
