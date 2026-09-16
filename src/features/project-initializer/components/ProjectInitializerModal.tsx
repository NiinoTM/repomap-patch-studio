import {
  Sparkles,
  FolderPlus,
  CheckCircle2,
  Loader2,
  X,
  FileCode,
} from "lucide-react";
import { useProjectInitializer } from "../hooks/useProjectInitializer";

interface ProjectInitializerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectInitializerModal({
  isOpen,
  onClose,
}: ProjectInitializerModalProps) {
  const {
    options,
    toggleOption,
    isInitializing,
    isBootstrapping,
    initDone,
    bootstrapOutput,
    handleInitializeProject,
  } = useProjectInitializer();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <FolderPlus className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">
                Greenfield Project Initializer (Create From Zero)
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono">
                Scaffold a fully bootable React + Express repo with modular SRP boundaries
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4 text-xs">
          <div className="bg-emerald-950/20 border border-emerald-800/40 p-3 rounded-lg text-emerald-300">
            <span className="font-semibold block mb-1">🌱 Clean Workspace Provisioning</span>
            <span className="text-zinc-400 text-[11px] block">
              This initializes entry points (<code className="text-emerald-300">src/main.tsx</code>, <code className="text-emerald-300">server/index.ts</code>), Vite, TypeScript, and architectural layer guards from scratch.
            </span>
          </div>

          <div className="space-y-2">
            <label className="flex items-start space-x-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={options.eslintLayerBoundaries}
                onChange={() => toggleOption("eslintLayerBoundaries")}
                className="accent-emerald-500 mt-0.5"
              />
              <div>
                <span className="font-semibold text-zinc-200 block">
                  Strict Layering & Boundary Rules (eslint-plugin-boundaries)
                </span>
                <span className="text-zinc-500 block text-[11px]">
                  Default disallow policy: blocks UI components from importing API clients directly, restricts Express routes to services only.
                </span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={options.featurePublicApiBarrier}
                onChange={() => toggleOption("featurePublicApiBarrier")}
                className="accent-emerald-500 mt-0.5"
              />
              <div>
                <span className="font-semibold text-zinc-200 block">
                  Feature Domain Encapsulation (Public API Barrier)
                </span>
                <span className="text-zinc-500 block text-[11px]">
                  Cross-feature imports must pass through domain <code className="text-cyan-400">index.ts</code> barrels. Deep internal coupling is rejected.
                </span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={options.strictAsyncSafety}
                onChange={() => toggleOption("strictAsyncSafety")}
                className="accent-emerald-500 mt-0.5"
              />
              <div>
                <span className="font-semibold text-zinc-200 block">
                  Strict Async Safety (@typescript-eslint/no-floating-promises)
                </span>
                <span className="text-zinc-500 block text-[11px]">
                  Enforces explicit promise awaits or error catchers to eliminate silent backend unhandled rejections.
                </span>
              </div>
            </label>

            <label className="flex items-start space-x-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={options.autoInstallDependencies}
                onChange={() => toggleOption("autoInstallDependencies")}
                className="accent-emerald-500 mt-0.5"
              />
              <div>
                <span className="font-semibold text-emerald-300 block">
                  1-Click Auto-Bootstrap (Install Dependencies & Activate Hooks)
                </span>
                <span className="text-zinc-500 block text-[11px]">
                  Automatically runs detected package manager (<code className="text-emerald-400">npm/pnpm/yarn/bun</code>) and activates git hooks right after file creation.
                </span>
              </div>
            </label>
          </div>

          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-400 space-y-1">
            <div className="text-zinc-500 uppercase font-bold text-[10px] mb-1 flex items-center space-x-1">
              <FileCode className="w-3 h-3 text-emerald-400" />
              <span>Runnable Scaffold Files:</span>
            </div>
            <div>✓ index.html & vite.config.ts (Frontend bundler)</div>
            <div>✓ src/main.tsx & src/App.tsx (Root UI mounting)</div>
            <div>✓ server/index.ts (Express backend entrypoint)</div>
            <div>✓ package.json & tsconfig.json (Full dependencies & build scripts)</div>
            <div>✓ eslint.config.js (Strategy 4b boundaries with default: disallow)</div>
            <div>✓ knip.json (Matching src/main.tsx! and server/index.ts!)</div>
          </div>

          {bootstrapOutput && (
            <div className="p-3 bg-zinc-950 rounded-lg border border-emerald-900/40 text-[11px] text-zinc-400 space-y-1 font-mono">
              <div className="text-emerald-400 uppercase font-bold text-[10px] flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Bootstrap Log:</span>
              </div>
              <pre className="max-h-24 overflow-y-auto text-[10px] text-zinc-300 custom-scrollbar whitespace-pre-wrap">
                {bootstrapOutput}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex justify-between items-center text-xs">
          <span className="text-[11px] text-zinc-500 font-mono">Action: Create From Zero</span>
          <button
            onClick={handleInitializeProject}
            disabled={isInitializing}
            className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold px-4 py-2 rounded-lg transition-all shadow-lg shadow-emerald-900/20 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            {isInitializing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {isBootstrapping
                    ? "Installing Packages & Activating..."
                    : "Writing Greenfield Files..."}
                </span>
              </>
            ) : initDone ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-950" />
                <span>Project Initialized!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Initialize Project From Zero</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}