import { DiffBlock } from "../../../types/patch";
import { GovernanceScaffoldOptions } from "../../../types/remediation";
import {
  INDEX_HTML_CONTENT,
  VITE_CONFIG_CONTENT,
  MAIN_TSX_CONTENT,
  APP_TSX_CONTENT,
  INDEX_CSS_CONTENT,
  SERVER_INDEX_CONTENT,
  ZOD_CONTRACTS_CONTENT,
  VITEST_SAMPLE_TEST,
  PLAYWRIGHT_CONFIG_CONTENT,
  PLAYWRIGHT_SMOKE_TEST,
} from "./starterFiles";
import {
  buildGreenfieldPackageJson,
  buildGreenfieldTsConfig,
  buildGreenfieldEslintConfig,
  buildGreenfieldKnipConfig,
  buildHuskyContent,
} from "./greenfieldTemplates";

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

function getCoreCodeBlocks(opts: GovernanceScaffoldOptions): DiffBlock[] {
  return [
    makeCreateBlock("package.json", buildGreenfieldPackageJson(opts)),
    makeCreateBlock("tsconfig.json", buildGreenfieldTsConfig(opts)),
    makeCreateBlock("eslint.config.js", buildGreenfieldEslintConfig(opts)),
    makeCreateBlock("index.html", INDEX_HTML_CONTENT),
    makeCreateBlock("vite.config.ts", VITE_CONFIG_CONTENT),
    makeCreateBlock("src/main.tsx", MAIN_TSX_CONTENT),
    makeCreateBlock("src/App.tsx", APP_TSX_CONTENT),
    makeCreateBlock("src/index.css", INDEX_CSS_CONTENT),
    makeCreateBlock("server/index.ts", SERVER_INDEX_CONTENT),
  ];
}

function getTestingToolBlocks(opts: GovernanceScaffoldOptions): DiffBlock[] {
  const blocks: DiffBlock[] = [];
  if (opts.vitestUnitTesting) {
    blocks.push(makeCreateBlock("src/utils/sample.test.ts", VITEST_SAMPLE_TEST));
  }
  if (opts.playwrightCriticalFlows) {
    blocks.push(makeCreateBlock("playwright.config.ts", PLAYWRIGHT_CONFIG_CONTENT));
    blocks.push(makeCreateBlock("e2e/smoke.spec.ts", PLAYWRIGHT_SMOKE_TEST));
  }
  return blocks;
}

function getGovernanceAuxBlocks(opts: GovernanceScaffoldOptions): DiffBlock[] {
  const blocks: DiffBlock[] = [];
  if (opts.knipDeadCodeDetection) {
    blocks.push(makeCreateBlock("knip.json", buildGreenfieldKnipConfig()));
  }
  if (opts.huskyPreCommitHook) {
    blocks.push(makeCreateBlock(".husky/pre-commit", buildHuskyContent(opts)));
  }
  if (opts.zodRuntimeContracts) {
    blocks.push(makeCreateBlock("src/types/contracts.ts", ZOD_CONTRACTS_CONTENT));
  }
  if (opts.featureDirectorySkeleton) {
    for (const dir of SKELETON_DIRS) {
      blocks.push(makeCreateBlock(`${dir}/.gitkeep`, ""));
    }
  }
  return blocks;
}

export function generateGreenfieldDiffBlocks(opts: GovernanceScaffoldOptions): DiffBlock[] {
  return [
    ...getCoreCodeBlocks(opts),
    ...getTestingToolBlocks(opts),
    ...getGovernanceAuxBlocks(opts),
  ];
}