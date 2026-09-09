import { GovernanceScaffoldOptions } from "../../../../types/remediation";
import {
  ShieldCheck,
  FileCode,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";

interface GovernanceScaffoldTabProps {
  options: GovernanceScaffoldOptions;
  onToggleOption: (key: keyof GovernanceScaffoldOptions) => void;
  isScaffolding: boolean;
  isBootstrapping?: boolean;
  scaffoldDone: boolean;
  bootstrapOutput?: string | null;
  onApplyScaffold: () => void;
}

interface ScaffoldOptionItemConfig {
  key: keyof GovernanceScaffoldOptions;
  title: React.ReactNode;
  description: React.ReactNode;
  containerClass?: string;
}

const SCAFFOLD_OPTIONS_LIST: ScaffoldOptionItemConfig[] = [
  {
    key: "eslintSizeLimits",
    title: (
      <span>
        1. File & Function Size Limits (<code className="text-cyan-400">250 .ts / 350 .tsx</code>)
      </span>
    ),
    description:
      "Warns when single files grow into God-files (separated: 250 lines for .ts, 350 for .tsx), prompting the AI to extract components or hooks.",
  },
  {
    key: "eslintLayerBoundaries",
    title: (
      <span>
        2. Layering & Boundary Rules (<code className="text-cyan-400">eslint-plugin-boundaries</code>)
      </span>
    ),
    description:
      "Blocks illegal imports (e.g. Components importing API directly, or Adapters importing Services).",
  },
  {
    key: "huskyPreCommitHook",
    title: (
      <span>
        3. Husky Git Pre-Commit Hook (<code className="text-cyan-400">.husky/pre-commit</code>)
      </span>
    ),
    description: (
      <span>
        Prevents Git commits if leaked patch markers (
        <code className="text-rose-400">&lt;&lt;&lt;&lt;&lt;&lt;&lt; SEARCH</code>) or lint failures exist.
      </span>
    ),
  },
  {
    key: "telemetryDbMonitoring",
    title: (
      <span>
        4. Process Telemetry & Auto-Clean Profiler (<code className="text-cyan-400">api_telemetry.db</code>)
      </span>
    ),
    description: (
      <span>
        Logs route and function latencies (<code className="text-cyan-400">duration_ms</code>, query params, status) to a lightweight SQLite DB with auto-cleaning to quickly spot slow, optimizable bottlenecks.
      </span>
    ),
  },
  {
    key: "featurePublicApiBarrier",
    title: (
      <span>
        5. Feature Encapsulation (<code className="text-cyan-400">Public API Barrier</code>)
      </span>
    ),
    description: (
      <span>
        Blocks deep cross-feature imports via strict <code className="text-cyan-400">index.ts</code> contracts and automatically configures <code className="text-cyan-400">sideEffects</code> in package.json to guarantee clean tree-shaking.
      </span>
    ),
  },
  {
    key: "knipDeadCodeDetection",
    title: (
      <span>
        6. Zombie Code & Unused Export Detector (<code className="text-cyan-400">knip</code>)
      </span>
    ),
    description:
      "Flags dead utility functions, abandoned components, and unused npm packages left behind after AI refactors.",
  },
  {
    key: "dpdmCircularCheck",
    title: (
      <span>
        7. Circular Dependency Trap (<code className="text-cyan-400">dpdm</code>)
      </span>
    ),
    description: (
      <span>
        Prevents circular import loops that cause silent runtime <code className="text-cyan-400">undefined</code> crashes in production bundles.
      </span>
    ),
  },
  {
    key: "strictAsyncSafety",
    title: (
      <span>
        8. Strict Async Safety (<code className="text-cyan-400">no-floating-promises</code>)
      </span>
    ),
    description:
      "Ensures all backend promises and API calls are explicitly awaited, preventing silent unhandled rejections.",
  },
  {
    key: "featureDirectorySkeleton",
    title: (
      <span>
        9. Feature-Driven Directory Skeleton (<code className="text-cyan-400">src/features, server/*</code>)
      </span>
    ),
    description: (
      <span>
        Provisions domain skeleton folders (<code className="text-cyan-400">src/features</code>, <code className="text-cyan-400">src/api</code>, <code className="text-cyan-400">server/adapters</code>, etc.) with <code className="text-cyan-400">.gitkeep</code> anchors.
      </span>
    ),
  },
  {
    key: "autoInstallDependencies",
    containerClass: "bg-cyan-950/20 border border-cyan-800/40 hover:border-cyan-700/60",
    title: (
      <span className="text-cyan-300 flex items-center space-x-1.5">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>10. 1-Click Environment Bootstrap (Auto-Install & Activate Hooks)</span>
      </span>
    ),
    description: (
      <span>
        Automatically detects package manager (<code className="text-cyan-400">npm/pnpm/yarn/bun</code>), installs dependencies, and activates Git hooks (<code className="text-cyan-400">npx husky</code>) right after injecting files.
      </span>
    ),
  },
  {
    key: "zodRuntimeContracts",
    title: (
      <span>
        11. Runtime Boundary Contracts (<code className="text-cyan-400">zod</code>)
      </span>
    ),
    description: (
      <span>
        Enforces schema validation at external boundaries (API request bodies, fetch responses, env vars) to eliminate runtime type drift and null-pointer crashes.
      </span>
    ),
  },
  {
    key: "vitestUnitTesting",
    title: (
      <span>
        12. Vitest Algorithm & Unit Testing Suite (<code className="text-cyan-400">vitest</code>)
      </span>
    ),
    description: (
      <span>
        Configures in-memory unit testing for services and utilities, adds <code className="text-cyan-400">npm test</code> pre-commit enforcement, and scaffolds starter test suites.
      </span>
    ),
  },
  {
    key: "playwrightCriticalFlows",
    title: (
      <span>
        13. Playwright Critical Path Smoke Gate (<code className="text-cyan-400">playwright</code>)
      </span>
    ),
    description: (
      <span>
        Scaffolds a lightweight headless browser runner and a starter <code className="text-cyan-400">e2e/smoke.spec.ts</code> test to guarantee that critical user flows never crash.
      </span>
    ),
  },
];

export function GovernanceScaffoldTab({
  options,
  onToggleOption,
  isScaffolding,
  isBootstrapping = false,
  scaffoldDone,
  bootstrapOutput,
  onApplyScaffold,
}: GovernanceScaffoldTabProps) {
  return (
    <div className="space-y-5 text-xs">
      <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl space-y-2">
        <h3 className="font-bold text-zinc-100 flex items-center space-x-2 text-sm">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Automated Architecture & Size Guardrails</span>
        </h3>
        <p className="text-zinc-400 leading-relaxed">
          Inject pre-configured ESLint, Husky, and Prettier rules directly into
          your project. This forces future AI edits to respect layer boundaries
          and file size ceilings before code is committed.
        </p>
      </div>

      <div className="space-y-3">
        {SCAFFOLD_OPTIONS_LIST.map((item) => (
          <label
            key={item.key}
            className={`flex items-start space-x-3 p-3 rounded-lg transition-colors cursor-pointer ${
              item.containerClass ||
              "bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700"
            }`}
          >
            <input
              type="checkbox"
              checked={options[item.key]}
              onChange={() => onToggleOption(item.key)}
              className="accent-cyan-500 mt-0.5 rounded"
            />
            <div className="space-y-0.5">
              <span className="font-semibold text-zinc-200 block">
                {item.title}
              </span>
              <span className="text-zinc-500 block text-[11px]">
                {item.description}
              </span>
            </div>
          </label>
        ))}

        <label className="flex items-start space-x-3 p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg hover:border-amber-700/60 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={options.softTechnicalDebtMode}
            onChange={() => onToggleOption("softTechnicalDebtMode")}
            className="accent-amber-500 mt-0.5 rounded"
          />
          <div className="space-y-0.5">
            <span className="font-semibold text-amber-300 flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                Technical Debt Soft Mode (Recommended for Existing Repos)
              </span>
            </span>
            <span className="text-zinc-400 block text-[11px]">
              Sets boundary rules to{" "}
              <code className="text-amber-400">"warn"</code> instead of{" "}
              <code className="text-rose-400">"error"</code> so legacy code
              doesn't immediately block your workflow.
            </span>
          </div>
        </label>
      </div>

      <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-400 space-y-1">
        <div className="text-zinc-500 uppercase font-bold text-[10px] mb-1 flex items-center space-x-1">
          <FileCode className="w-3 h-3 text-cyan-400" />
          <span>Files to be created/updated in target repo:</span>
        </div>
        <div>✓ tsconfig.json (Base TypeScript config for projectService)</div>
        <div>✓ eslint.config.js (Flat Config with boundary globs & typed async rules)</div>
        <div>✓ .husky/pre-commit (Marker leak detector & circular import gate)</div>
        <div>✓ knip.json (Dead code & unused export analyzer)</div>
        <div>✓ server/adapters/telemetryAdapter.ts (SQLite APM logger with auto-clean)</div>
        <div>✓ src/utils/sample.test.ts (Starter Vitest suite for business logic algorithms)</div>
        <div>✓ playwright.config.ts & e2e/smoke.spec.ts (E2E browser smoke tests for critical flows)</div>
        <div>✓ Feature directories: src/api, src/features, src/types, server/*</div>
        <div>
        ✓ package.json (dependencies: zod, devDependencies: vitest, playwright, dpdm, knip, husky + sideEffects: ["**/*.css"])
        </div>
      </div>

      {bootstrapOutput && (
        <div className="p-3 bg-zinc-950 rounded-lg border border-emerald-900/40 text-[11px] text-zinc-400 space-y-1 font-mono">
          <div className="text-emerald-400 uppercase font-bold text-[10px] flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Bootstrap Execution Log:</span>
          </div>
          <pre className="max-h-24 overflow-y-auto text-[10px] text-zinc-300 custom-scrollbar whitespace-pre-wrap">
            {bootstrapOutput}
          </pre>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={onApplyScaffold}
          disabled={isScaffolding}
          className="bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-cyan-900/20 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
        >
          {isScaffolding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {isBootstrapping
                  ? "Installing Packages & Activating Hooks..."
                  : "Injecting Governance Files..."}
              </span>
            </>
          ) : scaffoldDone ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-950" />
              <span>Governance Injected & Ready!</span>
            </>
          ) : (
            <>
              <Terminal className="w-4 h-4" />
              <span>Inject Governance Rules</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
