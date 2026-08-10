import { useState, useEffect } from "react";
import { Copy, Map, Eye, X, FileText, AtSign } from "lucide-react";
import { MentionDropdown } from "./prompt/MentionDropdown";
import { SuggestedContextBar } from "./prompt/SuggestedContextBar";
import { FileTree } from "./prompt/FileTree";
import { useMentionPopup } from "../hooks/useMentionPopup";
import { useSuggestedContext } from "../hooks/useSuggestedContext";
import { useFileSelection } from "../hooks/useFileSelection";
import { useTokenEstimate } from "../hooks/useTokenEstimate";
import { useCopyPrompt } from "../hooks/useCopyPrompt";
import {
  findMissingDependencies,
  MissingDependency,
} from "../utils/completenessCheck";
import { CompletenessWarningModal } from "./prompt/CompletenessWarningModal";
import { parseFileList } from "../utils/diffParser";

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
  discoveryMode: boolean;
  onDiscoveryModeChange: (value: boolean) => void;
  discoveredFiles: string[];
  onDiscoveredFilesConsumed: () => void;
}

export function PromptPanel({
  onCopy,
  onCopyMap,
  files,
  repoMap,
  fileStats,
  dependencyMap,
  onTokenStatsChange,
  discoveryMode,
  onDiscoveryModeChange,
  discoveredFiles,
  onDiscoveredFilesConsumed,
}: PromptPanelProps) {
  const [request, setRequest] = useState("");
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [missingDependencies, setMissingDependencies] = useState<
    MissingDependency[]
  >([]);
  const [pendingCopyAction, setPendingCopyAction] = useState<
    "full" | "files" | null
  >(null);
  const [autoConfirmCopy, setAutoConfirmCopy] = useState(false);

  const {
    seedFiles,
    selectedFiles,
    addSeedFile,
    toggleFile,
    toggleFolder,
    selectAll,
    deselectAll,
    toggleSuggestion,
    acceptAllSuggestions,
  } = useFileSelection({ request, files });

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
    onAddSeedFile: addSeedFile,
  });

  const suggestedFiles = useSuggestedContext({
    seedFiles,
    selectedFiles,
    dependencyMap,
  });

  const { repoMapTokens } = useTokenEstimate({
    repoMap,
    request,
    selectedFiles,
    fileStats,
    onTokenStatsChange,
  });

  const { isCopying, isCopyingFiles, copyFullContext, copyFilesAndPrompt } =
    useCopyPrompt({ selectedFiles, repoMap, request, discoveryMode, onCopy });

  // Runs after selectedFiles updates (post acceptAllSuggestions) so the
  // copy actions below read the freshly-added files, not a stale closure.
  useEffect(() => {
    if (!pendingCopyAction || !autoConfirmCopy) return;
    if (pendingCopyAction === "full") {
      copyFullContext();
    } else {
      copyFilesAndPrompt();
    }
    setPendingCopyAction(null);
    setAutoConfirmCopy(false);
    setMissingDependencies([]);
  }, [selectedFiles]);

  // Discovery mode round-trip: when the parent hands back a file list
  // parsed from the AI's "what do you need" response, fold it into the
  // normal selection set (same mechanism as accepting a suggestion) and
  // tell the parent it's been consumed so it doesn't get re-applied.
  useEffect(() => {
    if (!discoveredFiles || discoveredFiles.length === 0) return;
    acceptAllSuggestions(discoveredFiles);
    onDiscoveredFilesConsumed();
  }, [discoveredFiles]);

  const handleCopyClick = (action: "full" | "files") => {
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
    if (action === "full") {
      copyFullContext();
    } else {
      copyFilesAndPrompt();
    }
  };

  const handleAddMissingAndCopy = () => {
    acceptAllSuggestions(missingDependencies.map((dep) => dep.filePath));
    setAutoConfirmCopy(true);
  };

  const handleCopyAnyway = () => {
    if (pendingCopyAction === "full") {
      copyFullContext();
    } else if (pendingCopyAction === "files") {
      copyFilesAndPrompt();
    }
    setPendingCopyAction(null);
    setMissingDependencies([]);
  };

  const handleCancelCompletenessWarning = () => {
    setPendingCopyAction(null);
    setMissingDependencies([]);
  };

  const handlePasteSelection = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) return;
      const parsedFiles = parseFileList(clipboardText, files);
      if (parsedFiles.length > 0) {
        acceptAllSuggestions(parsedFiles);
      }
    } catch (err) {
      console.error("Failed to read clipboard for context paste:", err);
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
        onAddAllSuggestions={() =>
          acceptAllSuggestions(suggestedFiles.map((s) => s.filePath))
        }
        onToggleSuggestion={toggleSuggestion}
      />

      <FileTree
        files={files}
        selectedFiles={selectedFiles}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        onToggleFile={toggleFile}
        onToggleFolder={toggleFolder}
        onPasteSelection={handlePasteSelection}
      />

      <div className="space-y-2 text-xs text-zinc-300">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" defaultChecked className="accent-cyan-500" />
          <span>Enforce SEARCH/REPLACE blocks</span>
        </label>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={discoveryMode}
            onChange={(e) => onDiscoveryModeChange(e.target.checked)}
            className="accent-indigo-500"
          />
          <span>
            Discovery Mode
            <span className="text-zinc-500">
              {" "}
              — ask the AI which files it needs before sending any code
            </span>
          </span>
        </label>
      </div>

      <div className="flex space-x-2 shrink-0">
        <button
          onClick={() => handleCopyClick("full")}
          disabled={isCopying || isCopyingFiles}
          className={`flex-1 font-semibold py-2.5 rounded-lg shadow-lg flex items-center justify-center space-x-1.5 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer text-[11px] ${
            discoveryMode
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/10"
              : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/10"
          }`}
        >
          <Copy className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {isCopying
              ? "Assembling..."
              : discoveryMode
                ? "Ask AI What's Needed"
                : `Full Context (${selectedFiles.size})`}
          </span>
        </button>

        <button
          onClick={() => handleCopyClick("files")}
          disabled={
            isCopying ||
            isCopyingFiles ||
            selectedFiles.size === 0 ||
            discoveryMode
          }
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

      {missingDependencies.length > 0 && pendingCopyAction && (
        <CompletenessWarningModal
          missingDependencies={missingDependencies}
          onAddMissingAndCopy={handleAddMissingAndCopy}
          onCopyAnyway={handleCopyAnyway}
          onCancel={handleCancelCompletenessWarning}
        />
      )}
    </div>
  );
}
