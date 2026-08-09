import { useState, useEffect } from "react";

interface UseFileSelectionParams {
  request: string;
  files: string[];
}

export function useFileSelection({ request, files }: UseFileSelectionParams) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const addSeedFile = (filePath: string) => {
    setSelectedFiles((prev) => new Set(prev).add(filePath));
  };

  // Keep selectedFiles in sync with @mentions typed into the request text.
  useEffect(() => {
    const matches = Array.from(request.matchAll(/@([a-zA-Z0-9_\-./]+)/g));
    const currentMentions = new Set<string>();

    for (const match of matches) {
      const path = match[1];
      if (files.includes(path)) {
        currentMentions.add(path);
      }
    }

    setSelectedFiles((prev) => {
      const next = new Set(prev);
      currentMentions.forEach((f) => next.add(f));
      return next;
    });
  }, [request, files]);

  // Reset selection whenever the active repo's file list changes.
  useEffect(() => {
    setSelectedFiles(new Set());
  }, [files]);

  const toggleSuggestion = (filePath: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const acceptAllSuggestions = (filePaths: string[]) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      filePaths.forEach((f) => next.add(f));
      return next;
    });
  };

  const selectAll = () => {
    setSelectedFiles(new Set(files));
  };

  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  const toggleFile = (filePath: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const toggleFolder = (folderFiles: string[], shouldSelect: boolean) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (!shouldSelect) {
        folderFiles.forEach((f) => next.delete(f));
      } else {
        folderFiles.forEach((f) => next.add(f));
      }
      return next;
    });
  };

  return {
    seedFiles: selectedFiles, // Aliased to prevent breaking destructuring in PromptPanel
    acceptedSuggestions: new Set<string>(), // Stubbed to prevent breakage
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
