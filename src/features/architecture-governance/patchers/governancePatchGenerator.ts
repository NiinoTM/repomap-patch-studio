import { DiffBlock } from "../../../types/patch";
import { GovernanceScaffoldOptions } from "../../../types/remediation";
import { patchPackageJson } from "./packageJsonPatcher";
import { patchTsConfig } from "./tsConfigPatcher";
import { patchEslintConfig } from "./eslintBoundaryPatcher";
import {
  buildHuskyPreCommit,
  buildKnipConfig,
  buildTelemetryAdapter,
  buildZodContractsStarter,
  buildVitestSampleTest,
  buildPlaywrightConfig,
  buildPlaywrightSmokeTest,
} from "./governanceAuxTemplates";

function makeBlock(
  file: string,
  replace: string,
  search = "",
  changeType: "CREATE" | "MODIFY" = "CREATE",
): DiffBlock {
  return {
    id: `patch-${file.replace(/[^a-zA-Z0-9]/g, "-")}-${Math.random().toString(36).slice(2, 7)}`,
    file,
    status: "match",
    search,
    replace,
    changeType,
  };
}

interface AuxBlockCandidate {
  file: string;
  getContent: () => string;
  enabled: boolean;
}

function getAuxCandidates(opts: GovernanceScaffoldOptions): AuxBlockCandidate[] {
  return [
    { file: ".husky/pre-commit", getContent: () => buildHuskyPreCommit(opts), enabled: opts.huskyPreCommitHook },
    { file: "knip.json", getContent: buildKnipConfig, enabled: opts.knipDeadCodeDetection },
    { file: "server/adapters/telemetryAdapter.ts", getContent: buildTelemetryAdapter, enabled: opts.telemetryDbMonitoring },
    { file: "src/types/contracts.ts", getContent: buildZodContractsStarter, enabled: opts.zodRuntimeContracts },
    { file: "src/utils/sample.test.ts", getContent: buildVitestSampleTest, enabled: opts.vitestUnitTesting },
    { file: "playwright.config.ts", getContent: buildPlaywrightConfig, enabled: opts.playwrightCriticalFlows },
    { file: "e2e/smoke.spec.ts", getContent: buildPlaywrightSmokeTest, enabled: opts.playwrightCriticalFlows },
  ];
}

function getAuxiliaryBlocks(
  opts: GovernanceScaffoldOptions,
  existingFiles: Record<string, string>,
): DiffBlock[] {
  const blocks: DiffBlock[] = [];
  const candidates = getAuxCandidates(opts);
  for (const { file, getContent, enabled } of candidates) {
    if (enabled && !existingFiles[file]) {
      blocks.push(makeBlock(file, getContent()));
    }
  }
  return blocks;
}

export function generateGovernancePatchBlocks(
  opts: GovernanceScaffoldOptions,
  existingFiles: Record<string, string>,
): DiffBlock[] {
  const blocks: DiffBlock[] = [];

  const pkgPatch = patchPackageJson(existingFiles["package.json"], opts);
  blocks.push(
    makeBlock("package.json", pkgPatch.content, pkgPatch.isModified ? existingFiles["package.json"] : "", pkgPatch.isModified ? "MODIFY" : "CREATE"),
  );

  const tsPatch = patchTsConfig(existingFiles["tsconfig.json"], opts);
  blocks.push(
    makeBlock("tsconfig.json", tsPatch.content, tsPatch.isModified ? existingFiles["tsconfig.json"] : "", tsPatch.isModified ? "MODIFY" : "CREATE"),
  );

  const eslintPatch = patchEslintConfig(existingFiles["eslint.config.js"], opts);
  if (eslintPatch.content) {
    blocks.push(
      makeBlock("eslint.config.js", eslintPatch.content, eslintPatch.isModified ? existingFiles["eslint.config.js"] : "", eslintPatch.isModified ? "MODIFY" : "CREATE"),
    );
  }

  blocks.push(...getAuxiliaryBlocks(opts, existingFiles));
  return blocks;
}