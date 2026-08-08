import { useState, useEffect, useMemo } from "react";
import { Copy, Map, Eye, X, FileText, AtSign } from "lucide-react";
import {
  formatActiveFilesContext,
  buildFullContextPrompt,
  buildFilesAndPromptOnly,
} from "../utils/promptTemplates";
import { MentionDropdown } from "./prompt/MentionDropdown";
import { SuggestedContextBar } from "./prompt/SuggestedContextBar";
import { FileTree } from "./prompt/FileTree";
import { filesApi } from "../api/client";
import { useMentionPopup } from "../hooks/useMentionPopup";
import { useSuggestedContext } from "../hooks/useSuggestedContext";

interface PromptPanelProps {
  onCopy: (promptText: string) => void;
  onCopyMap: (mapText: string) => void;
  files: string[];
  repoMap: string;
  fileStats?: Record<string, { size: number; tokens: number }>;
  dependencyMap?: {
    outbound: Record<string, string[]>;
    inbound: Record<string, string[]>;
    apiOutbound?: Record<string, string[]>;
    apiInbound?: Record<string, string[]>;
  };
  onTokenStatsChange?: (stats: {
    total: number;
    map: number;
    files: number;
    selectedCount: number;
  }) => void;
}

export function PromptPanel({
  onCopy,
  onCopyMap,
  files,
  repoMap,
  fileStats,
  dependencyMap,
  onTokenStatsChange,
}: PromptPanelProps) {
  const [request, setRequest] = useState("");
  const [seedFiles, setSeedFiles] = useState<Set<string>>(new Set());
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isCopyingFiles, setIsCopyingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedFiles = useMemo(() => {
    const combined = new Set<string>(seedFiles);
    acceptedSuggestions.forEach((f) => combined.add(f));
    return combined;
  }, [seedFiles, acceptedSuggestions]);

  const handleAddSeedFile = (filePath: string) => {
    setSeedFiles((prev) => new Set(prev).add(filePath));
  };

  const {
    textareaRef,
    mentionPopupRef,
    mentionQuery,
    mentionMatches,
    mentionPos,
    activeMentionIndex,
    setActiveMentionIndex,
    handleTextareaChange,
    handleTextareaKeyDown,
    insertMention,
  } = useMentionPopup({
    request,
    files,
    setRequest,
    onAddSeedFile: handleAddSeedFile,
  });

  const suggestedFiles = useSuggestedContext({
    seedFiles,
    selectedFiles,
    dependencyMap,
  });

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

  useEffect(() => {
    setSeedFiles(new Set());
    setAcceptedSuggestions(new Set());
  }, [files]);

  const handleAddAllSuggestions = () => {
    setAcceptedSuggestions((prev) => {
      const next = new Set(prev);
      suggestedFiles.forEach((item) => next.add(item.filePath));
      return next;
    });
  };

  const handleToggleSuggestion = (filePath: string) => {
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

  const repoMapTokens = useMemo(
    () => Math.ceil((repoMap?.length || 0) / 3.8),
    [repoMap],
  );

  const selectedFilesTokens = useMemo(() => {
    let total = 0;
    selectedFiles.forEach((file) => {
      total += fileStats?.[file]?.tokens || 0;
    });
    return total;
  }, [selectedFiles, fileStats]);

  const promptOverheadTokens = useMemo(
    () => Math.ceil((request.length + 800) / 3.8),
    [request],
  );
  const totalEstimatedTokens =
    repoMapTokens + selectedFilesTokens + promptOverheadTokens;

  useEffect(() => {
    if (onTokenStatsChange) {
      onTokenStatsChange({
        total: totalEstimatedTokens,
        map: repoMapTokens,
        files: selectedFilesTokens,
        selectedCount: selectedFiles.size,
      });
    }
  }, [
    totalEstimatedTokens,
    repoMapTokens,
    selectedFilesTokens,
    selectedFiles.size,
    onTokenStatsChange,
  ]);

  const handleSelectAll = () => {
    setSeedFiles(new Set(files));
    setAcceptedSuggestions(new Set());
  };

  const handleDeselectAll = () => {
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

  return (
    <div className="border-r border-zinc-800 flex flex-col h-full p-4 space-y-4 bg-zinc-950/50">
      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-500/10 rounded">
            <Map className="w-4 h-4 text-cyan-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-200">
              Repo Map Ready
            </p>
            <p className="text-[10px] text-zinc-500">
              ~{repoMapTokens.toLocaleString()} map tokens / {files.length}{" "}
              files
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsMapModalOpen(true)}
          className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 rounded hover:bg-zinc-800"
          title="Preview Repo Map"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 relative">
        <div className="flex items-center justify-between">
          <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold flex items-center">
            <span>User Request</span>
            <span className="ml-2 text-[10px] text-cyan-500/80 normal-case font-normal flex items-center">
              <AtSign className="w-3 h-3 inline mr-0.5" /> Type @ to link files
            </span>
          </label>
        </div>

        <MentionDropdown
          mentionQuery={mentionQuery}
          mentionMatches={mentionMatches}
          mentionPos={mentionPos}
          activeMentionIndex={activeMentionIndex}
          selectedFiles={selectedFiles}
          mentionPopupRef={mentionPopupRef}
          onInsertMention={insertMention}
          onHoverMention={setActiveMentionIndex}
        />

        <textarea
          ref={textareaRef}
          className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50 resize-none font-sans"
          placeholder="Describe the changes needed... (type @ to fuzzy match files)"
          value={request}
          onChange={handleTextareaChange}
          onKeyDown={handleTextareaKeyDown}
        />
      </div>

      <SuggestedContextBar
        suggestedFiles={suggestedFiles}
        onAddAllSuggestions={handleAddAllSuggestions}
        onToggleSuggestion={handleToggleSuggestion}
      />

      <FileTree
        files={files}
        selectedFiles={selectedFiles}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onToggleFile={toggleFile}
        onToggleFolder={toggleFolder}
      />

      <div className="space-y-2 text-xs text-zinc-300">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" defaultChecked className="accent-cyan-500" />
          <span>Enforce SEARCH/REPLACE blocks</span>
        </label>
      </div>

      <div className="flex space-x-2 shrink-0">
        <button
          onClick={async () => {
            setIsCopying(true);
            try {
              const data = await filesApi.fetchFiles(Array.from(selectedFiles));

              const activeFilesText = formatActiveFilesContext(
                selectedFiles,
                data.contents || {},
              );
              const finalPrompt = buildFullContextPrompt({
                repoMap,
                activeFilesText,
                userRequest: request,
              });

              onCopy(finalPrompt);
            } finally {
              setIsCopying(false);
            }
          }}
          disabled={isCopying || isCopyingFiles}
          className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-2.5 rounded-lg shadow-lg shadow-cyan-500/10 flex items-center justify-center space-x-1.5 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer text-[11px]"
        >
          <Copy className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {isCopying
              ? "Assembling..."
              : `Full Context (${selectedFiles.size})`}
          </span>
        </button>

        <button
          onClick={async () => {
            setIsCopyingFiles(true);
            try {
              const data = await filesApi.fetchFiles(Array.from(selectedFiles));

              const activeFilesText = formatActiveFilesContext(
                selectedFiles,
                data.contents || {},
              );
              const finalPrompt = buildFilesAndPromptOnly({
                activeFilesText,
                userRequest: request,
              });

              onCopy(finalPrompt);
            } finally {
              setIsCopyingFiles(false);
            }
          }}
          disabled={isCopying || isCopyingFiles || selectedFiles.size === 0}
          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2.5 rounded-lg flex items-center justify-center space-x-1.5 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer border border-zinc-700 text-[11px]"
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {isCopyingFiles
              ? "Fetching..."
              : `Files + Prompt (${selectedFiles.size})`}
          </span>
        </button>
      </div>

      {isMapModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
              <h2 className="text-sm font-bold text-zinc-200">
                Repo Map Context Preview (~{repoMapTokens.toLocaleString()}
                tokens)
              </h2>
              <button
                onClick={() => setIsMapModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
              <pre className="font-mono text-xs text-zinc-300 bg-zinc-900 p-4 rounded-lg border border-zinc-800 whitespace-pre-wrap">
                {repoMap || "Generating Repo Map..."}
              </pre>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-end space-x-3">
              <button
                onClick={() => setIsMapModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onCopyMap(repoMap);
                  setIsMapModalOpen(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-lg shadow-cyan-900/20 cursor-pointer"
              >
                Copy Raw Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}