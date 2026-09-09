import { DiffBlock } from "../../../types/patch";
import { GovernanceScaffoldOptions } from "../../../types/remediation";
import {
  buildTsConfig,
  buildEslintConfig,
  buildHuskyPreCommit,
  buildKnipConfig,
  buildTelemetryAdapter,
  buildZodContractsStarter,
  buildPackageJson,
} from "./scaffoldTemplates";

function makeCreateBlock(file: string, replace: string): DiffBlock {
  return {
    id: `scaffold-${file.replace(/[^a-zA-Z0-9]/g, "-")}-${Math.random().toString(36).slice(2, 7)}`,
    file,
    status: "match",
    search: "",
    replace,
    changeType: "CREATE",
  };
}

const SKELETON_DIRS = [
  "src/api",
  "src/features",
  "src/types",
  "src/utils",
  "server/routes",
  "server/services",
  "server/adapters",
];

export function generateGovernanceDiffBlocks(opts: GovernanceScaffoldOptions): DiffBlock[] {
  const blocks: DiffBlock[] = [
    makeCreateBlock("tsconfig.json", buildTsConfig()),
    makeCreateBlock("eslint.config.js", buildEslintConfig(opts)),
    makeCreateBlock("package.json", buildPackageJson(opts)),
  ];

  if (opts.huskyPreCommitHook) {
    blocks.push(makeCreateBlock(".husky/pre-commit", buildHuskyPreCommit(opts)));
  }
  if (opts.knipDeadCodeDetection) {
    blocks.push(makeCreateBlock("knip.json", buildKnipConfig()));
  }
  if (opts.telemetryDbMonitoring) {
    blocks.push(makeCreateBlock("server/adapters/telemetryAdapter.ts", buildTelemetryAdapter()));
  }
  if (opts.zodRuntimeContracts) {
    blocks.push(makeCreateBlock("src/types/contracts.ts", buildZodContractsStarter()));
  }
  if (opts.featureDirectorySkeleton) {
    for (const dir of SKELETON_DIRS) {
      blocks.push(makeCreateBlock(`${dir}/.gitkeep`, ""));
    }
    blocks.push(makeCreateBlock("src/index.ts", "export const ready = true;\n"));
  }

  return blocks;
}