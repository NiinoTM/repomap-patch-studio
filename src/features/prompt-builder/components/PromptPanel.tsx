import { useState, useEffect } from "react";
import { AtSign } from "lucide-react";
import { MentionDropdown } from "./prompt/MentionDropdown";
import { SuggestedContextBar } from "./prompt/SuggestedContextBar";
import { FileTree } from "./prompt/FileTree";
import {
  RepoMapHeader,
  RepoMapPreviewModal,
} from "./prompt/RepoMapPreviewModal";
import { PromptActionButtons } from "./prompt/PromptActionButtons";
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
import { Ticket } from "../../../types/ticket";
import { CheckSquare } from "lucide-react";

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
  activeTicket?: Ticket | null;
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
  activeTicket,
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
      <RepoMapHeader
        repoMapTokens={repoMapTokens}
        filesCount={files.length}
        onOpenModal={() => setIsMapModalOpen(true)}
      />

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

        {activeTicket && (
          <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-lg p-2 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 min-w-0">
              <CheckSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="font-bold text-indigo-200 font-mono shrink-0">
                {activeTicket.id}:
              </span>
              <span className="text-zinc-300 truncate font-sans">
                {activeTicket.title}
              </span>
            </div>
            <button
              onClick={() => {
                let text = `[${activeTicket.id}] ${activeTicket.title}`;
                if (activeTicket.description) {
                  text += `\n\nContext & Description:\n${activeTicket.description}`;
                }
                if (
                  activeTicket.requirements &&
                  activeTicket.requirements.length > 0
                ) {
                  text += `\n\nAcceptance Criteria / Requirements Checklist:\n${activeTicket.requirements
                    .map((r) => `- [ ] ${r}`)
                    .join("\n")}`;
                }
                setRequest((prev) => text + (prev ? `\n\n${prev}` : ""));
              }}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono shrink-0 ml-2 hover:underline cursor-pointer"
            >
              + Inject to prompt
            </button>
          </div>
        )}

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

      <PromptActionButtons
        discoveryMode={discoveryMode}
        selectedFilesCount={selectedFiles.size}
        isCopying={isCopying}
        isCopyingFiles={isCopyingFiles}
        onCopyFull={() => handleCopyClick("full")}
        onCopyFiles={() => handleCopyClick("files")}
      />

      <RepoMapPreviewModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        repoMap={repoMap}
        repoMapTokens={repoMapTokens}
        onCopyMap={onCopyMap}
      />

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
