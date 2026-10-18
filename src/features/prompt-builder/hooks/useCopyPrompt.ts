import { useState } from "react";
import { fetchActiveFilesContent } from "./usePromptActions";
import {
  buildFullContextPrompt,
  buildFilesAndPromptOnly,
  buildDiscoveryPrompt,
  buildUnitTestPrompt,
} from "../utils/promptTemplates";

interface UseCopyPromptParams {
  selectedFiles: Set<string>;
  repoMap: string;
  request: string;
  discoveryMode: boolean;
  onCopy: (promptText: string) => void | Promise<void>;
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
  const [isCopyingTests, setIsCopyingTests] = useState(false);

  const fetchActiveFilesText = async () => {
    return fetchActiveFilesContent(selectedFiles, request);
  };

  const copyFullContext = async () => {
    setIsCopying(true);
    try {
      if (discoveryMode) {
        const discoveryPrompt = buildDiscoveryPrompt({
          repoMap,
          userRequest: request,
        });
        await onCopy(discoveryPrompt);
        return;
      }
      const activeFilesText = await fetchActiveFilesText();
      const finalPrompt = buildFullContextPrompt({
        repoMap,
        activeFilesText,
        userRequest: request,
      });
      await onCopy(finalPrompt);
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
      await onCopy(finalPrompt);
    } finally {
      setIsCopyingFiles(false);
    }
  };

  const copyUnitTestPrompt = async () => {
    setIsCopyingTests(true);
    try {
      const activeFilesText = await fetchActiveFilesText();
      const finalPrompt = buildUnitTestPrompt({
        activeFilesText,
        userRequest: request,
      });
      await onCopy(finalPrompt);
    } finally {
      setIsCopyingTests(false);
    }
  };

  return {
    isCopying,
    isCopyingFiles,
    isCopyingTests,
    copyFullContext,
    copyFilesAndPrompt,
    copyUnitTestPrompt,
  };
}
