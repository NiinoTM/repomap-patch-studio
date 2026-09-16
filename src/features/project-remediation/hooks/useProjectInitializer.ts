import { useState } from "react";
import { patchApi } from "../../../api/patchApi";
import { repoApi } from "../../../api/repoApi";
import { generateGovernanceDiffBlocks } from "../utils/scaffoldGenerator";
import { GovernanceScaffoldOptions } from "../../../types/remediation";

export const DEFAULT_SCAFFOLD_OPTIONS: GovernanceScaffoldOptions = {
  eslintSizeLimits: true,
  eslintLayerBoundaries: true,
  huskyPreCommitHook: true,
  huskyLeakedMarkerCheck: true,
  telemetryDbMonitoring: true,
  featurePublicApiBarrier: true,
  knipDeadCodeDetection: true,
  dpdmCircularCheck: true,
  strictAsyncSafety: true,
  featureDirectorySkeleton: true,
  autoInstallDependencies: true,
  zodRuntimeContracts: true,
  vitestUnitTesting: true,
  playwrightCriticalFlows: true,
  softTechnicalDebtMode: true,
};

export interface UseProjectInitializerReturn {
  scaffoldOptions: GovernanceScaffoldOptions;
  toggleOption: (key: keyof GovernanceScaffoldOptions) => void;
  isScaffolding: boolean;
  isBootstrapping: boolean;
  scaffoldDone: boolean;
  bootstrapOutput: string | null;
  handleApplyScaffold: () => Promise<void>;
  resetScaffoldStatus: () => void;
}

export function useProjectInitializer(): UseProjectInitializerReturn {
  const [scaffoldOptions, setScaffoldOptions] =
    useState<GovernanceScaffoldOptions>(DEFAULT_SCAFFOLD_OPTIONS);
  const [isScaffolding, setIsScaffolding] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [scaffoldDone, setScaffoldDone] = useState(false);
  const [bootstrapOutput, setBootstrapOutput] = useState<string | null>(null);

  const toggleOption = (key: keyof GovernanceScaffoldOptions) => {
    setScaffoldOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetScaffoldStatus = () => {
    setScaffoldDone(false);
    setBootstrapOutput(null);
  };

  const handleApplyScaffold = async () => {
    setIsScaffolding(true);
    setBootstrapOutput(null);
    try {
      const blocks = generateGovernanceDiffBlocks(scaffoldOptions);
      const res = await patchApi.applyStream(
        {
          blocks,
          commitMessage: "chore: inject architecture governance guardrails and directory skeleton",
          skipCommit: true,
          commit: false,
        },
        () => {},
      );

      if (!res.success) {
        alert(`❌ Failed to inject governance: ${res.error || "Unknown error"}`);
        return;
      }

      if (scaffoldOptions.autoInstallDependencies) {
        setIsBootstrapping(true);
        const bootRes = await repoApi.bootstrapRepo();
        if (bootRes.success) {
          setBootstrapOutput(
            bootRes.output || "Packages installed and Git hooks initialized successfully.",
          );
        } else {
          alert(
            `⚠️ Governance files injected, but auto-install failed:\n${bootRes.error || "Unknown error"}\nYou can run npm install manually.`,
          );
        }
      }

      setScaffoldDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`❌ Error applying governance scaffold: ${msg}`);
    } finally {
      setIsScaffolding(false);
      setIsBootstrapping(false);
    }
  };

  return {
    scaffoldOptions,
    toggleOption,
    isScaffolding,
    isBootstrapping,
    scaffoldDone,
    bootstrapOutput,
    handleApplyScaffold,
    resetScaffoldStatus,
  };
}