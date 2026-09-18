import { useState } from "react";
import { patchApi } from "../../../api/patchApi";
import { repoApi, filesApi } from "../../../api/repoApi";
import { generateGovernancePatchBlocks } from "../patchers/governancePatchGenerator";
import { GovernanceScaffoldOptions } from "../../../types/remediation";

export const DEFAULT_BROWNFIELD_OPTIONS: GovernanceScaffoldOptions = {
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
  softTechnicalDebtMode: true, // Warns instead of errors for legacy stability
};

export interface UseGovernancePatcherReturn {
  options: GovernanceScaffoldOptions;
  toggleOption: (key: keyof GovernanceScaffoldOptions) => void;
  isPatching: boolean;
  isBootstrapping: boolean;
  patchDone: boolean;
  bootstrapOutput: string | null;
  handleApplyGuardrails: () => Promise<void>;
  resetStatus: () => void;
}

export function useGovernancePatcher(): UseGovernancePatcherReturn {
  const [options, setOptions] = useState<GovernanceScaffoldOptions>(
    DEFAULT_BROWNFIELD_OPTIONS,
  );
  const [isPatching, setIsPatching] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [patchDone, setPatchDone] = useState(false);
  const [bootstrapOutput, setBootstrapOutput] = useState<string | null>(null);

  const toggleOption = (key: keyof GovernanceScaffoldOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetStatus = () => {
    setPatchDone(false);
    setBootstrapOutput(null);
  };

  const handleApplyGuardrails = async () => {
    setIsPatching(true);
    setBootstrapOutput(null);
    try {
      const filesToFetch = [
        "package.json",
        "tsconfig.json",
        "eslint.config.js",
        ".husky/pre-commit",
        "knip.json",
      ];
      const fetched = await filesApi.fetchFiles(filesToFetch);
      const blocks = generateGovernancePatchBlocks(options, fetched.contents || {});

      const res = await patchApi.applyStream(
        {
          blocks,
          commitMessage: "chore: apply non-destructive architecture governance guardrails",
          skipCommit: true,
          commit: false,
        },
        () => {},
      );

      if (!res.success) {
        alert(`❌ Failed to inject guardrails: ${res.error || "Unknown error"}`);
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
            `⚠️ Guardrails injected, but auto-install failed:\n${bootRes.error || "Unknown error"}\nYou can run npm install manually.`,
          );
        }
      }

      setPatchDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`❌ Error applying guardrails: ${msg}`);
    } finally {
      setIsPatching(false);
      setIsBootstrapping(false);
    }
  };

  return {
    options,
    toggleOption,
    isPatching,
    isBootstrapping,
    patchDone,
    bootstrapOutput,
    handleApplyGuardrails,
    resetStatus,
  };
}