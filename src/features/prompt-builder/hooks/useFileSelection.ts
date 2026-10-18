import { useState, useEffect } from "react";
import {
  ContextSelectionItem,
  ContextSelectionSet,
  extractContextItemsFromText,
} from "../../../types/contextSelection";

interface UseFileSelectionParams {
  request: string;
  files: string[];
}

export function useFileSelection({ request, files }: UseFileSelectionParams) {
  const [selectedFiles, setSelectedFiles] = useState<ContextSelectionSet>(
    () => new ContextSelectionSet(),
  );

  const addSeedFile = (filePath: string) => {
    setSelectedFiles((prev) => new ContextSelectionSet(prev).add(filePath));
  };

  // Keep selectedFiles in sync with @mentions and directives in the request text.
  useEffect(() => {
    const extracted = extractContextItemsFromText(request);
    const validExtracted = extracted.filter((item) => files.includes(item.path));

    if (validExtracted.length > 0) {
      setSelectedFiles((prev) => {
        const next = new ContextSelectionSet(prev);
        validExtracted.forEach((item) => next.add(item));
        return next;
      });
    }
  }, [request, files]);

  // Reset selection whenever the active repo's file list changes.
  useEffect(() => {
    setSelectedFiles(new ContextSelectionSet());
  }, [files]);

  const toggleSuggestion = (filePath: string) => {
    setSelectedFiles((prev) => {
      const next = new ContextSelectionSet(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const acceptAllSuggestions = (items: (ContextSelectionItem | string)[]) => {
    setSelectedFiles((prev) => {
      const next = new ContextSelectionSet(prev);
      items.forEach((item) => next.add(item));
      return next;
    });
  };

  const selectAll = () => {
    setSelectedFiles(new ContextSelectionSet(files));
  };

  const deselectAll = () => {
    setSelectedFiles(new ContextSelectionSet());
  };

  const toggleFile = (filePath: string) => {
    setSelectedFiles((prev) => {
      const next = new ContextSelectionSet(prev);
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
      const next = new ContextSelectionSet(prev);
      if (!shouldSelect) {
        folderFiles.forEach((f) => next.delete(f));
      } else {
        folderFiles.forEach((f) => next.add(f));
      }
      return next;
    });
  };

  return {
    seedFiles: selectedFiles,
    acceptedSuggestions: new Set<string>(),
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
