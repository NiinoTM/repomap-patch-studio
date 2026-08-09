import { useState } from "react";
import { filesApi } from "../../../api/repoApi";
import {
  formatActiveFilesContext,
  buildFullContextPrompt,
  buildFilesAndPromptOnly,
  buildDiscoveryPrompt,
} from "../utils/promptTemplates";

interface UseCopyPromptParams {
  selectedFiles: Set<string>;
  repoMap: string;
  request: string;
  discoveryMode: boolean;
  onCopy: (promptText: string) => void;
}

// Extracted from PromptPanel.tsx — the two "copy" button handlers were
// near-identical (fetch selected files, build a prompt, hand it to onCopy),
// duplicated with only the builder function swapped. This also moves the
// direct filesApi.fetchFiles() call out of the component and into a hook,
// which is what components-to-api boundary rule expects.
export function useCopyPrompt({
  selectedFiles,
  repoMap,
  request,
  discoveryMode,
  onCopy,
}: UseCopyPromptParams) {
  const [isCopying, setIsCopying] = useState(false);
  const [isCopyingFiles, setIsCopyingFiles] = useState(false);

  const fetchActiveFilesText = async () => {
    const data = await filesApi.fetchFiles(Array.from(selectedFiles));
    return formatActiveFilesContext(selectedFiles, data.contents || {});
  };

  const copyFullContext = async () => {
    setIsCopying(true);
    try {
      if (discoveryMode) {
        const discoveryPrompt = buildDiscoveryPrompt({
          repoMap,
          userRequest: request,
        });
        onCopy(discoveryPrompt);
        return;
      }
      const activeFilesText = await fetchActiveFilesText();
      const finalPrompt = buildFullContextPrompt({
        repoMap,
        activeFilesText,
        userRequest: request,
      });
      onCopy(finalPrompt);
    } finally {
      setIsCopying(false);
    }
  };

  const copyFilesAndPrompt = async () => {
    setIsCopyingFiles(true);
    try {
      const activeFilesText = await fetchActiveFilesText();
      const finalPrompt = buildFilesAndPromptOnly({
        activeFilesText,
        userRequest: request,
      });
      onCopy(finalPrompt);
    } finally {
      setIsCopyingFiles(false);
    }
  };

  return { isCopying, isCopyingFiles, copyFullContext, copyFilesAndPrompt };
}
