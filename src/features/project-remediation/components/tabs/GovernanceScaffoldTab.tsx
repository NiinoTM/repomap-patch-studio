import { GovernanceScaffoldOptions } from "../../../../types/remediation";
import {
  ShieldCheck,
  FileCode,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface GovernanceScaffoldTabProps {
  options: GovernanceScaffoldOptions;
  onToggleOption: (key: keyof GovernanceScaffoldOptions) => void;
  isScaffolding: boolean;
  scaffoldDone: boolean;
  onApplyScaffold: () => void;
}

export function GovernanceScaffoldTab({
  options,
  onToggleOption,
  isScaffolding,
  scaffoldDone,
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
        <label className="flex items-start space-x-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-lg hover:border-zinc-700 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={options.eslintSizeLimits}
            onChange={() => onToggleOption("eslintSizeLimits")}
            className="accent-cyan-500 mt-0.5 rounded"
          />
          <div className="space-y-0.5">
            <span className="font-semibold text-zinc-200 block">
              1. File & Function Size Limits (
              <code className="text-cyan-400">250 .ts / 350 .tsx</code>)
            </span>
            <span className="text-zinc-500 block text-[11px]">
              Warns when single files grow into God-files (separated: 250 lines for
              .ts, 350 for .tsx), prompting the AI to extract components or hooks.
            </span>
          </div>
        </label>

        <label className="flex items-start space-x-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-lg hover:border-zinc-700 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={options.eslintLayerBoundaries}
            onChange={() => onToggleOption("eslintLayerBoundaries")}
            className="accent-cyan-500 mt-0.5 rounded"
          />
          <div className="space-y-0.5">
            <span className="font-semibold text-zinc-200 block">
              2. Layering & Boundary Rules (
              <code className="text-cyan-400">eslint-plugin-boundaries</code>)
            </span>
            <span className="text-zinc-500 block text-[11px]">
              Blocks illegal imports (e.g. Components importing API directly, or
              Adapters importing Services).
            </span>
          </div>
        </label>

        <label className="flex items-start space-x-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-lg hover:border-zinc-700 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={options.huskyPreCommitHook}
            onChange={() => onToggleOption("huskyPreCommitHook")}
            className="accent-cyan-500 mt-0.5 rounded"
          />
          <div className="space-y-0.5">
            <span className="font-semibold text-zinc-200 block">
              3. Husky Git Pre-Commit Hook (
              <code className="text-cyan-400">.husky/pre-commit</code>)
            </span>
            <span className="text-zinc-500 block text-[11px]">
              Prevents Git commits if leaked patch markers (
              <code className="text-rose-400">
                &lt;&lt;&lt;&lt;&lt;&lt;&lt; SEARCH
              </code>
              ) or lint failures exist.
            </span>
          </div>
        </label>

        <label className="flex items-start space-x-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-lg hover:border-zinc-700 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={options.telemetryDbMonitoring}
            onChange={() => onToggleOption("telemetryDbMonitoring")}
            className="accent-cyan-500 mt-0.5 rounded"
          />
          <div className="space-y-0.5">
            <span className="font-semibold text-zinc-200 block">
              4. Process Telemetry & Auto-Clean Profiler (
              <code className="text-cyan-400">api_telemetria.db</code>)
            </span>
            <span className="text-zinc-500 block text-[11px]">
              Logs route and function latencies (<code className="text-cyan-400">duracao_ms</code>, query params, status) to a lightweight SQLite DB with auto-cleaning to quickly spot slow, optimizable bottlenecks.
            </span>
          </div>
        </label>

        <label className="flex items-start space-x-3 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-lg hover:border-zinc-700 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={options.featurePublicApiBarrier}
            onChange={() => onToggleOption("featurePublicApiBarrier")}
            className="accent-cyan-500 mt-0.5 rounded"
          />
          <div className="space-y-0.5">
            <span className="font-semibold text-zinc-200 block">
              5. Feature Encapsulation (
              <code className="text-cyan-400">Public API Barrier</code>)
            </span>
            <span className="text-zinc-500 block text-[11px]">
              Blocks deep cross-feature imports, forcing features to consume peer domains strictly via an explicit{" "}
              <code className="text-cyan-400">index.ts</code> contract and keeping internals isolated.
            </span>
          </div>
        </label>

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
        <div>✓ eslint.config.js (Flat Config with separated limits: 250 .ts / 350 .tsx)</div>
        <div>✓ .husky/pre-commit (Marker leak detector)</div>
        <div>
          ✓ package.json (devDependencies: eslint-plugin-boundaries, husky)
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={onApplyScaffold}
          disabled={isScaffolding}
          className="bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-cyan-900/20 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
        >
          {isScaffolding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Injecting Governance Files...</span>
            </>
          ) : scaffoldDone ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-950" />
              <span>Governance Injected Successfully!</span>
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
