export interface GovernanceScaffoldOptions {
  eslintSizeLimits: boolean;
  eslintLayerBoundaries: boolean;
  huskyPreCommitHook: boolean;
  huskyLeakedMarkerCheck: boolean;
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

export interface RemediationState {
  activeTab: "scaffold" | "refactor";
  scaffoldOptions: GovernanceScaffoldOptions;
  isScaffolding: boolean;
  scaffoldComplete: boolean;
  refactorStep: "idle" | "analyzing" | "blueprint-ready" | "executing" | "done";
  blueprint: FeatureBlueprintDomain[];
  selectedMoveIds: Set<string>;
}
