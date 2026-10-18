import { SocraticConfrontationModal } from "./SocraticConfrontationModal";
import { BlueprintReviewModal } from "./BlueprintReviewModal";
import { BlueprintDiscoveryModal } from "./BlueprintDiscoveryModal";
import { RepoMapPreviewModal } from "./RepoMapPreviewModal";
import { CompletenessWarningModal } from "./CompletenessWarningModal";
import type { UseSocraticGateReturn } from "../../hooks/useSocraticGate";
import type { UseBlueprintWorkflowReturn } from "../../hooks/useBlueprintWorkflow";
import type { MissingDependency } from "../../utils/completenessCheck";
import { useOptionalContextSelectionState } from "../../context/ContextSelectionContext";
import { ContextSelectionSet } from "../../../../types/contextSelection";

interface PromptPanelModalsProps {
  socraticGate: UseSocraticGateReturn;
  onApplyFortifiedCriteria: () => void;
  blueprintWorkflow: UseBlueprintWorkflowReturn;
  isMapModalOpen: boolean;
  onCloseMapModal: () => void;
  repoMap: string;
  repoMapTokens: number;
  onCopyMap: (text: string) => void;
  missingDependencies: MissingDependency[];
  hasPendingCopyAction: boolean;
  onAddMissingAndCopy: () => void;
  onCopyAnyway: () => void;
  onCancelCompletenessWarning: () => void;
  files?: string[];
  selectedFiles?: Set<string> | ContextSelectionSet;
  onAddDiscoveredFiles?: (files: string[]) => void;
}

export function PromptPanelModals({
  socraticGate,
  onApplyFortifiedCriteria,
  blueprintWorkflow,
  isMapModalOpen,
  onCloseMapModal,
  repoMap,
  repoMapTokens,
  onCopyMap,
  missingDependencies,
  hasPendingCopyAction,
  onAddMissingAndCopy,
  onCopyAnyway,
  onCancelCompletenessWarning,
  files,
  selectedFiles: propSelectedFiles,
  onAddDiscoveredFiles,
}: PromptPanelModalsProps) {
  const state = useOptionalContextSelectionState();
  const selectedFiles = propSelectedFiles ?? state?.selectedFiles;
  return (
    <>
      <SocraticConfrontationModal
        isOpen={socraticGate.isOpen}
        onClose={socraticGate.closeModal}
        critiqueText={socraticGate.critiqueText}
        onCritiqueChange={socraticGate.setCritiqueText}
        answersText={socraticGate.answersText}
        onAnswersChange={socraticGate.setAnswersText}
        onApplyFortified={onApplyFortifiedCriteria}
        hasConfrontation={socraticGate.hasConfrontation}
        isPersisting={socraticGate.isPersisting}
        files={files}
        selectedFiles={selectedFiles}
        onAddDiscoveredFiles={onAddDiscoveredFiles}
      />

      <BlueprintDiscoveryModal
        isOpen={blueprintWorkflow.isDiscoveryModalOpen}
        onClose={blueprintWorkflow.closeDiscoveryModal}
        discoveryPayload={blueprintWorkflow.discoveryPayload}
        onAcceptCandidates={(paths) => {
          if (onAddDiscoveredFiles) {
            onAddDiscoveredFiles(paths);
          }
          blueprintWorkflow.closeDiscoveryModal();
        }}
        onBypassDiscovery={() => {
          blueprintWorkflow.closeDiscoveryModal();
        }}
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
        onClose={onCloseMapModal}
        repoMap={repoMap}
        repoMapTokens={repoMapTokens}
        onCopyMap={onCopyMap}
      />

      {missingDependencies.length > 0 && hasPendingCopyAction && (
        <CompletenessWarningModal
          missingDependencies={missingDependencies}
          onAddMissingAndCopy={onAddMissingAndCopy}
          onCopyAnyway={onCopyAnyway}
          onCancel={onCancelCompletenessWarning}
        />
      )}
    </>
  );
}