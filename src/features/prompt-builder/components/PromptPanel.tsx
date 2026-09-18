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
import { BlueprintReviewModal } from "./prompt/BlueprintReviewModal";
import { SocraticConfrontationModal } from "./prompt/SocraticConfrontationModal";
import { ActiveTicketBanner } from "./prompt/ActiveTicketBanner";
import { useMentionPopup } from "../hooks/useMentionPopup";
import { useSuggestedContext } from "../hooks/useSuggestedContext";
import { useFileSelection } from "../hooks/useFileSelection";
import { useTokenEstimate } from "../hooks/useTokenEstimate";
import { useCopyPrompt } from "../hooks/useCopyPrompt";
import { useBlueprintWorkflow } from "../hooks/useBlueprintWorkflow";
import { useSocraticGate } from "../hooks/useSocraticGate";
import { useCompletenessGuard } from "../hooks/useCompletenessGuard";
import { CompletenessWarningModal } from "./prompt/CompletenessWarningModal";
import {
  buildArchitecturalBlueprintPrompt,
  formatActiveFilesContext,
} from "../utils/promptTemplates";
import {
  buildSocraticConfrontationPrompt,
  sanitizeSocraticAnswers,
} from "../utils/socraticPrompt";
import { ticketApi } from "../../../api/ticketApi";
import { parseFileList } from "../utils/diffParser";
import { Ticket } from "../../../types/ticket";

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

  const {
    isCopying,
    isCopyingFiles,
    isCopyingTests,
    copyFullContext,
    copyFilesAndPrompt,
    copyUnitTestPrompt,
  } = useCopyPrompt({ selectedFiles, repoMap, request, discoveryMode, onCopy });

  const blueprintWorkflow = useBlueprintWorkflow();
  const socraticGate = useSocraticGate();

  const {
    missingDependencies,
    pendingCopyAction,
    handleCopyClick,
    handleAddMissingAndCopy,
    handleCopyAnyway,
    handleCancelCompletenessWarning,
  } = useCompletenessGuard({
    selectedFiles,
    dependencyMap,
    discoveryMode,
    copyFullContext,
    copyFilesAndPrompt,
    copyUnitTestPrompt,
    acceptAllSuggestions,
  });

  const handleConfrontLogic = () => {
    const prompt = buildSocraticConfrontationPrompt({
      repoMap,
      activeFilesText: formatActiveFilesContext(selectedFiles, {}),
      userRequest: request || "Interrogate requirements for missing failure modes and routing.",
      activeTicket,
    });
    onCopy(prompt);
    socraticGate.openModal();
  };

  const handleApplyFortifiedCriteria = async () => {
    await socraticGate.applyFortifiedCriteria(async (fortified) => {
      setRequest((prev) => prev + fortified);

      if (activeTicket) {
        const check = sanitizeSocraticAnswers(socraticGate.answersText);
        const currentReqs = activeTicket.requirements || [];
        const newReq = `[Socratic] ${check.sanitized.slice(0, 120)}`;
        if (!currentReqs.includes(newReq)) {
          const updatedReqs = [...currentReqs, newReq];
          try {
            await ticketApi.updateTicket(activeTicket.id, {
              requirements: updatedReqs,
            });
            activeTicket.requirements = updatedReqs;
          } catch (err) {
            console.error("Failed to persist requirements to ticket on disk:", err);
          }
        }
      }
    });
  };

  const handleGenerateBlueprintPrompt = () => {
    const prompt = buildArchitecturalBlueprintPrompt({
      repoMap,
      activeFilesText: formatActiveFilesContext(selectedFiles, {}),
      userRequest: request || "Generate modular architecture following SRP.",
    });
    onCopy(prompt);
  };

  useEffect(() => {
    if (!discoveredFiles || discoveredFiles.length === 0) return;
    acceptAllSuggestions(discoveredFiles);
    onDiscoveredFilesConsumed();
  }, [discoveredFiles]);

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
          <ActiveTicketBanner
            activeTicket={activeTicket}
            onInjectToPrompt={(text) =>
              setRequest((prev) => text + (prev ? `\n\n${prev}` : ""))
            }
          />
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
        isCopyingTests={isCopyingTests}
        isBlueprintApproved={blueprintWorkflow.isApproved}
        onCopyFull={() => handleCopyClick("full")}
        onCopyFiles={() => handleCopyClick("files")}
        onCopyTests={() => handleCopyClick("tests")}
        onGenerateBlueprint={handleGenerateBlueprintPrompt}
        onOpenBlueprintReview={blueprintWorkflow.openReviewModal}
        onConfrontLogic={handleConfrontLogic}
        hasConfrontation={socraticGate.hasConfrontation}
      />

      <SocraticConfrontationModal
        isOpen={socraticGate.isOpen}
        onClose={socraticGate.closeModal}
        critiqueText={socraticGate.critiqueText}
        onCritiqueChange={socraticGate.setCritiqueText}
        answersText={socraticGate.answersText}
        onAnswersChange={socraticGate.setAnswersText}
        onApplyFortified={handleApplyFortifiedCriteria}
        hasConfrontation={socraticGate.hasConfrontation}
        isPersisting={socraticGate.isPersisting}
      />

      <BlueprintReviewModal
        isOpen={blueprintWorkflow.isReviewModalOpen}
        onClose={blueprintWorkflow.closeReviewModal}
        blueprint={blueprintWorkflow.blueprint}
        rawInput={blueprintWorkflow.rawInput}
        onRawInputChange={blueprintWorkflow.setRawInput}
        validationError={blueprintWorkflow.validationError}
        onValidate={blueprintWorkflow.validateAndApplyBlueprint}
        onApprove={blueprintWorkflow.approveBlueprint}
        isApproved={blueprintWorkflow.isApproved}
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
