import { useState, useEffect } from "react";
import { AtSign } from "lucide-react";
import { MentionDropdown } from "./prompt/MentionDropdown";
import { SuggestedContextBar } from "./prompt/SuggestedContextBar";
import { FileTree } from "./prompt/FileTree";
import { RepoMapHeader } from "./prompt/RepoMapPreviewModal";
import { PromptActionButtons } from "./prompt/PromptActionButtons";
import { PromptOptions } from "./prompt/PromptOptions";
import { AtomicStepTracker } from "./prompt/AtomicStepTracker";
import { ActiveTicketBanner } from "./prompt/ActiveTicketBanner";
import { PromptPanelModals } from "./prompt/PromptPanelModals";
import { useMentionPopup } from "../hooks/useMentionPopup";
import { useSuggestedContext } from "../hooks/useSuggestedContext";
import { useFileSelection } from "../hooks/useFileSelection";
import { useTokenEstimate } from "../hooks/useTokenEstimate";
import { useCopyPrompt } from "../hooks/useCopyPrompt";
import { useBlueprintWorkflow } from "../hooks/useBlueprintWorkflow";
import { useAtomicStepper } from "../hooks/useAtomicStepper";
import { useSocraticGate } from "../hooks/useSocraticGate";
import { useCompletenessGuard } from "../hooks/useCompletenessGuard";
import { usePromptActions } from "../hooks/usePromptActions";
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
  const atomicStepper = useAtomicStepper({
    blueprint: blueprintWorkflow.blueprint,
    isApproved: blueprintWorkflow.isApproved,
  });

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

  const {
    handleConfrontLogic,
    handleApplyFortifiedCriteria,
    handleGenerateBlueprintPrompt,
    handleCopyStepPrompt,
    handleFinishAndGenerateTests,
  } = usePromptActions({
    request,
    setRequest,
    selectedFiles,
    repoMap,
    activeTicket,
    onCopy,
    socraticGate,
    atomicStepper,
  });

  useEffect(() => {
    if (!discoveredFiles || discoveredFiles.length === 0) return;
    acceptAllSuggestions(discoveredFiles);
    onDiscoveredFilesConsumed();
  }, [discoveredFiles]);

  const handlePasteSelection = async () => {
    const clipboardText = await navigator.clipboard.readText().catch(() => "");
    const parsedFiles = parseFileList(clipboardText, files);
    if (parsedFiles.length > 0) {
      acceptAllSuggestions(parsedFiles);
    }
  };

  return (
    <div className="border-r border-zinc-800 flex flex-col h-full p-4 space-y-4 bg-zinc-950/50">
      <RepoMapHeader
        repoMapTokens={repoMapTokens}
        filesCount={files.length}
        onOpenModal={() => setIsMapModalOpen(true)}
      />

      {atomicStepper.steps.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              Mode: {atomicStepper.isBatchMode ? "Domain Batch" : "Single File"}
            </span>
            <button
              onClick={atomicStepper.toggleBatchMode}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer underline underline-offset-2"
              title="Toggle between single-file atomic steps and cohesive domain batch steps"
            >
              Switch to {atomicStepper.isBatchMode ? "Single File" : "Domain Batch"}
            </button>
          </div>
          <AtomicStepTracker
            currentStep={atomicStepper.currentStep}
            currentStepIndex={atomicStepper.isBatchMode ? atomicStepper.currentBatchIndex : atomicStepper.currentStepIndex}
            totalSteps={atomicStepper.isBatchMode ? atomicStepper.totalBatches : atomicStepper.totalSteps}
            progressPercent={atomicStepper.progressPercent}
            isLastStep={atomicStepper.isLastStep}
            isFinished={atomicStepper.isFinished}
            hasErrorsOrUnapplied={missingDependencies.length > 0}
            onCopyStepPrompt={handleCopyStepPrompt}
            onNextStep={() => atomicStepper.nextStep()}
            onPrevStep={atomicStepper.prevStep}
            onAddAdHocStep={atomicStepper.addAdHocStep}
            onFinishAndGenerateTests={handleFinishAndGenerateTests}
          />
        </div>
      )}

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

      <PromptOptions
        discoveryMode={discoveryMode}
        onDiscoveryModeChange={onDiscoveryModeChange}
      />

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

      <PromptPanelModals
        socraticGate={socraticGate}
        onApplyFortifiedCriteria={handleApplyFortifiedCriteria}
        blueprintWorkflow={blueprintWorkflow}
        isMapModalOpen={isMapModalOpen}
        onCloseMapModal={() => setIsMapModalOpen(false)}
        repoMap={repoMap}
        repoMapTokens={repoMapTokens}
        onCopyMap={onCopyMap}
        missingDependencies={missingDependencies}
        hasPendingCopyAction={Boolean(pendingCopyAction)}
        onAddMissingAndCopy={handleAddMissingAndCopy}
        onCopyAnyway={handleCopyAnyway}
        onCancelCompletenessWarning={handleCancelCompletenessWarning}
      />
    </div>
  );
}
