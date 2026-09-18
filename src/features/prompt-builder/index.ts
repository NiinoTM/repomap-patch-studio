// Presentation Components
export { Header } from "./components/Header";
export { PromptPanel } from "./components/PromptPanel";
export { DiffPanel } from "./components/DiffPanel";
export { Footer } from "./components/Footer";
export { Toast } from "./components/Toast";
export { BlueprintReviewModal } from "./components/prompt/BlueprintReviewModal";
export { PromptActionButtons } from "./components/prompt/PromptActionButtons";
export { SocraticConfrontationModal } from "./components/prompt/SocraticConfrontationModal";
export { AtomicStepTracker } from "./components/prompt/AtomicStepTracker";
export {
  BlueprintDiscoveryModal,
  type BlueprintDiscoveryModalProps,
} from "./components/prompt/BlueprintDiscoveryModal";
export {
  buildArchitecturalDiscoveryPrompt,
  type BlueprintDiscoveryPromptParams,
} from "./utils/blueprintDiscoveryPrompt";
export {
  BlueprintSuspendedBanner,
  type BlueprintSuspendedBannerProps,
} from "./components/prompt/BlueprintSuspendedBanner";
export {
  buildPhaseBatchStepPrompt,
  groupTargetFilesByPhase,
  type PhaseBatchStepPromptParams,
} from "./utils/stepperPrompt";
export type {
  UseAtomicStepperReturn,
} from "./hooks/useAtomicStepper";

// Custom Hooks
export { useBlueprintWorkflow } from "./hooks/useBlueprintWorkflow";
export type { UseBlueprintWorkflowReturn } from "./hooks/useBlueprintWorkflow";
export { useAtomicStepper } from "./hooks/useAtomicStepper";
export type {
  UseAtomicStepperParams,
  UseAtomicStepperReturn,
} from "./hooks/useAtomicStepper";
export { useSocraticGate } from "./hooks/useSocraticGate";
export { useRepoContext } from "./hooks/useRepoContext";
export { usePasteAndValidate } from "./hooks/usePasteAndValidate";
export { useApplyChanges } from "./hooks/useApplyChanges";
export { useCopyPrompt } from "./hooks/useCopyPrompt";
export { useFileSelection } from "./hooks/useFileSelection";
export { useHeaderActions } from "./hooks/useHeaderActions";
export { useMentionPopup } from "./hooks/useMentionPopup";
export { useSuggestedContext } from "./hooks/useSuggestedContext";
export type { SuggestedFile } from "./components/prompt/SuggestedContextBar";
export { useTokenEstimate } from "./hooks/useTokenEstimate";

// Domain Utilities
export { findUntestedFiles } from "./utils/testDetection";
export {
  filterRepoMapByScope,
  extractAvailableScopes,
  fileMatchesScope,
} from "./utils/scopeFilter";
export {
  formatActiveFilesContext,
  buildUnitTestPrompt,
  buildFullContextPrompt,
  buildDiscoveryPrompt,
  buildFilesAndPromptOnly,
  buildArchitecturalBlueprintPrompt,
  buildAutoHealPrompt,
} from "./utils/promptTemplates";
export { buildSocraticConfrontationPrompt } from "./utils/socraticPrompt";
export {
  buildStepScopedPrompt,
  sortTargetFilesTopologically,
} from "./utils/stepperPrompt";
export { parseDiffBlocks, parseFileList } from "./utils/diffParser";
export { generateCommitMessage } from "./utils/commitMessageGenerator";
export { buildFileTree, type TreeNode } from "./utils/treeBuilder";
export { fuzzySearchFiles, type FuzzyResult } from "./utils/fuzzySearch";
export { matchesFileContent, validateBlocks } from "./utils/blockMatcher";
export {
  computeLineDiff,
  getLineDiffStats,
  type DiffLine,
  type LineDiffStats,
} from "./utils/lineDiff";
export { enrichWithCharDiffs, type CharDiff } from "./utils/charDiff";
export {
  findMissingDependencies,
  type MissingDependency,
} from "./utils/completenessCheck";