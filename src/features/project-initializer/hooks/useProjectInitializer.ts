import { useState } from "react";
import { patchApi } from "../../../api/patchApi";
import { repoApi } from "../../../api/repoApi";
import { generateGreenfieldDiffBlocks } from "../generators/greenfieldScaffolder";
import { GovernanceScaffoldOptions } from "../../../types/remediation";

export const DEFAULT_GREENFIELD_OPTIONS: GovernanceScaffoldOptions = {
  eslintSizeLimits: true,
  eslintLayerBoundaries: true,
  huskyPreCommitHook: true,
  huskyLeakedMarkerCheck: true,
  telemetryDbMonitoring: false,
  featurePublicApiBarrier: true,
  knipDeadCodeDetection: true,
  dpdmCircularCheck: true,
  strictAsyncSafety: true,
  featureDirectorySkeleton: true,
  autoInstallDependencies: true,
  zodRuntimeContracts: true,
  vitestUnitTesting: true,
  playwrightCriticalFlows: true,
  softTechnicalDebtMode: false,
};

export interface UseProjectInitializerReturn {
  options: GovernanceScaffoldOptions;
  toggleOption: (key: keyof GovernanceScaffoldOptions) => void;
  isInitializing: boolean;
  isBootstrapping: boolean;
  initDone: boolean;
  bootstrapOutput: string | null;
  handleInitializeProject: () => Promise<void>;
  resetStatus: () => void;
}

export function useProjectInitializer(): UseProjectInitializerReturn {
  const [options, setOptions] = useState<GovernanceScaffoldOptions>(
    DEFAULT_GREENFIELD_OPTIONS,
  );
  const [isInitializing, setIsInitializing] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [initDone, setInitDone] = useState(false);
  const [bootstrapOutput, setBootstrapOutput] = useState<string | null>(null);

  const toggleOption = (key: keyof GovernanceScaffoldOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetStatus = () => {
    setInitDone(false);
    setBootstrapOutput(null);
  };

  const handleInitializeProject = async () => {
    setIsInitializing(true);
    setBootstrapOutput(null);
    try {
      const blocks = generateGreenfieldDiffBlocks(options);
      const res = await patchApi.applyStream(
        {
          blocks,
          commitMessage: "chore: initialize greenfield project with modular governance structure",
          skipCommit: true,
          commit: false,
        },
        () => {},
      );

      if (!res.success) {
        alert(`❌ Initialization failed: ${res.error || "Unknown error"}`);
        return;
      }

      if (options.autoInstallDependencies) {
        setIsBootstrapping(true);
        const bootRes = await repoApi.bootstrapRepo();
        if (bootRes.success) {
          setBootstrapOutput(
            bootRes.output || "Packages installed and Git hooks initialized successfully.",
          );
        } else {
          alert(
            `⚠️ Project files generated, but package install failed:\n${bootRes.error || "Unknown error"}\nYou can run npm install manually.`,
          );
        }
      }

      setInitDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`❌ Error creating project from zero: ${msg}`);
    } finally {
      setIsInitializing(false);
      setIsBootstrapping(false);
    }
  };

  return {
    options,
    toggleOption,
    isInitializing,
    isBootstrapping,
    initDone,
    bootstrapOutput,
    handleInitializeProject,
    resetStatus,
  };
}