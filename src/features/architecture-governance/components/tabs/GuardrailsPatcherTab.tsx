import { GovernanceScaffoldOptions } from "../../../../types/remediation";
import {
  ShieldCheck,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface GuardrailsPatcherTabProps {
  options: GovernanceScaffoldOptions;
  onToggleOption: (key: keyof GovernanceScaffoldOptions) => void;
  isPatching: boolean;
  isBootstrapping?: boolean;
  patchDone: boolean;
  bootstrapOutput?: string | null;
  onApplyGuardrails: () => void;
}

export function GuardrailsPatcherTab({
  options,
  onToggleOption,
  isPatching,
  isBootstrapping = false,
  patchDone,
  bootstrapOutput,
  onApplyGuardrails,
}: GuardrailsPatcherTabProps) {
  return (
    <div className="space-y-5 text-xs">
      <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl space-y-2">
        <h3 className="font-bold text-zinc-100 flex items-center space-x-2 text-sm">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Brownfield Guardrails & Policy Injection</span>
        </h3>
        <p className="text-zinc-400 leading-relaxed">
          Inject progressive linting and architecture rules into this existing codebase.
          Use Technical Debt Soft Mode to avoid breaking legacy commits while preventing new violations.
        </p>
      </div>

      <div className="space-y-3">
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
              <span>Technical Debt Soft Mode (Recommended for Existing Repos)</span>
            </span>
            <span className="text-zinc-400 block text-[11px]">
              Sets boundary rules to <code className="text-amber-400">"warn"</code> instead of{" "}
              <code className="text-rose-400">"error"</code> so preexisting legacy code doesn't crash your build.
            </span>
          </div>
        </label>

        <label className="flex items-start space-x-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={options.eslintSizeLimits}
            onChange={() => onToggleOption("eslintSizeLimits")}
            className="accent-cyan-500 mt-0.5 rounded"
          />
          <div className="space-y-0.5">
            <span className="font-semibold text-zinc-200 block">
              File & Function Size Ceilings (250 .ts / 350 .tsx)
            </span>
            <span className="text-zinc-500 block text-[11px]">
              Warns when single files grow into God-files, flagging modules in need of sub-component extraction.
            </span>
          </div>
        </label>

        <label className="flex items-start space-x-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={options.eslintLayerBoundaries}
            onChange={() => onToggleOption("eslintLayerBoundaries")}
            className="accent-cyan-500 mt-0.5 rounded"
          />
          <div className="space-y-0.5">
            <span className="font-semibold text-zinc-200 block">
              Layering & Boundary Protection (eslint-plugin-boundaries)
            </span>
            <span className="text-zinc-500 block text-[11px]">
              Prevents UI components from importing backend code and stops controllers from querying databases directly.
            </span>
          </div>
        </label>

        <label className="flex items-start space-x-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={options.huskyPreCommitHook}
            onChange={() => onToggleOption("huskyPreCommitHook")}
            className="accent-cyan-500 mt-0.5 rounded"
          />
          <div className="space-y-0.5">
            <span className="font-semibold text-zinc-200 block">
              Git Pre-Commit Hook (.husky/pre-commit)
            </span>
            <span className="text-zinc-500 block text-[11px]">
              Blocks git commits if leaked AI patch markers or unhandled circular dependency loops exist.
            </span>
          </div>
        </label>
      </div>

      {bootstrapOutput && (
        <div className="p-3 bg-zinc-950 rounded-lg border border-emerald-900/40 text-[11px] text-zinc-400 space-y-1 font-mono">
          <div className="text-emerald-400 uppercase font-bold text-[10px] flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Execution Summary:</span>
          </div>
          <pre className="max-h-24 overflow-y-auto text-[10px] text-zinc-300 custom-scrollbar whitespace-pre-wrap">
            {bootstrapOutput}
          </pre>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={onApplyGuardrails}
          disabled={isPatching}
          className="bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-cyan-900/20 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
        >
          {isPatching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {isBootstrapping
                  ? "Installing & Activating Hooks..."
                  : "Injecting Governance Rules..."}
              </span>
            </>
          ) : patchDone ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-950" />
              <span>Guardrails Injected!</span>
            </>
          ) : (
            <>
              <Terminal className="w-4 h-4" />
              <span>Apply Guardrails to Workspace</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}