export interface GovernanceScaffoldOptions {
  eslintSizeLimits: boolean;
  eslintLayerBoundaries: boolean;
  huskyPreCommitHook: boolean;
  huskyLeakedMarkerCheck: boolean;
  telemetryDbMonitoring: boolean;
  featurePublicApiBarrier: boolean;
  knipDeadCodeDetection: boolean;
  dpdmCircularCheck: boolean;
  strictAsyncSafety: boolean;
  featureDirectorySkeleton: boolean;
  autoInstallDependencies: boolean;
  zodRuntimeContracts: boolean;
  vitestUnitTesting: boolean;
  playwrightCriticalFlows: boolean;
  softTechnicalDebtMode: boolean; // Sets boundary rules to 'warn' instead of 'error'
}

export interface ProposedFileMove {
  id: string;
  sourcePath: string;
  targetPath: string;
  targetFeature: string;
  reason: string;
  dependentFilesCount: number;
  status: "pending" | "approved" | "completed" | "error";
  errorDetails?: string;
}

export interface FeatureBlueprintDomain {
  name: string;
  description: string;
  proposedPath: string;
  filesToMove: ProposedFileMove[];
}

export type RefactorStep = "idle" | "analyzing" | "blueprint-ready" | "executing" | "done";

export interface ProjectInitializerState {
  scaffoldOptions: GovernanceScaffoldOptions;
  isScaffolding: boolean;
  isBootstrapping: boolean;
  scaffoldDone: boolean;
  bootstrapOutput: string | null;
}

export interface ArchitectureRefactorState {
  refactorStep: RefactorStep;
  blueprint: FeatureBlueprintDomain[];
  selectedMoveIds: Set<string>;
}

export interface RemediationState {
  activeTab: "scaffold" | "refactor";
  scaffoldOptions: GovernanceScaffoldOptions;
  isScaffolding: boolean;
  scaffoldComplete: boolean;
  refactorStep: RefactorStep;
  blueprint: FeatureBlueprintDomain[];
  selectedMoveIds: Set<string>;
}
