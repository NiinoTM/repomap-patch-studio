import { FeatureBlueprintDomain } from "../../../../types/remediation";
import {
  FolderTree,
  Sparkles,
  ArrowRight,
  CheckSquare,
  Square,
  Loader2,
  CheckCircle2,
} from "lucide-react";

interface ArchitectureRefactorTabProps {
  step: "idle" | "analyzing" | "blueprint-ready" | "executing" | "done";
  blueprint: FeatureBlueprintDomain[];
  selectedMoveIds: Set<string>;
  onToggleMoveSelection: (id: string) => void;
  onAnalyzeProject: () => void;
  onExecuteMoves: () => void;
}

export function ArchitectureRefactorTab({
  step,
  blueprint,
  selectedMoveIds,
  onToggleMoveSelection,
  onAnalyzeProject,
  onExecuteMoves,
}: ArchitectureRefactorTabProps) {
  return (
    <div className="space-y-5 text-xs">
      <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl space-y-2">
        <h3 className="font-bold text-zinc-100 flex items-center space-x-2 text-sm">
          <FolderTree className="w-4 h-4 text-purple-400" />
          <span>Feature-Driven Architecture Restructuring</span>
        </h3>
        <p className="text-zinc-400 leading-relaxed">
          Migrate flat, messy directories (
          <code className="text-zinc-300">src/components/*</code>,{" "}
          <code className="text-zinc-300">src/utils/*</code>) into cohesive
          domain features (
          <code className="text-purple-300">src/features/[domain]/*</code>).
          RepoMap generates an AI blueprint and executes the moves safely using
          verified <code className="text-cyan-400">MOVE</code> blocks.
        </p>
      </div>

      {step === "idle" && (
        <div className="py-8 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-center space-y-3 bg-zinc-900/20">
          <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
          <div className="space-y-1">
            <p className="font-bold text-zinc-200">
              Scan Codebase for Refactoring Blueprint
            </p>
            <p className="text-zinc-500 max-w-sm text-[11px]">
              Analyzes your Repo Map to group unorganized files into modular
              feature folders with zero broken imports.
            </p>
          </div>
          <button
            onClick={onAnalyzeProject}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors flex items-center space-x-2 cursor-pointer shadow-lg shadow-purple-900/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Feature Blueprint</span>
          </button>
        </div>
      )}

      {step === "analyzing" && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="font-semibold text-zinc-300">
            Analyzing symbol dependencies and clustering into domain features...
          </p>
        </div>
      )}

      {(step === "blueprint-ready" ||
        step === "executing" ||
        step === "done") && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px]">
              Proposed Feature Domains ({blueprint.length})
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              {selectedMoveIds.size} file moves selected
            </span>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
            {blueprint.map((domain) => (
              <div
                key={domain.name}
                className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 space-y-2.5"
              >
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                  <div>
                    <span className="font-bold text-purple-300 font-mono text-xs">
                      {domain.proposedPath}/
                    </span>
                    <p className="text-[10px] text-zinc-500">
                      {domain.description}
                    </p>
                  </div>
                  <span className="text-[10px] bg-purple-950/60 text-purple-300 border border-purple-800/40 px-2 py-0.5 rounded font-mono">
                    {domain.filesToMove.length} files
                  </span>
                </div>

                <div className="space-y-1.5">
                  {domain.filesToMove.map((move) => {
                    const isSelected = selectedMoveIds.has(move.id);
                    return (
                      <div
                        key={move.id}
                        onClick={() => onToggleMoveSelection(move.id)}
                        className={`flex items-center justify-between p-2 rounded border transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-zinc-800/70 border-zinc-700 text-zinc-200"
                            : "bg-zinc-950/40 border-zinc-900 text-zinc-500 opacity-60"
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0 pr-2">
                          <button className="text-zinc-400">
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                            ) : (
                              <Square className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span className="font-mono text-[11px] truncate">
                            {move.sourcePath}
                          </span>
                          <ArrowRight className="w-3 h-3 text-zinc-600 shrink-0" />
                          <span className="font-mono text-[11px] text-purple-300 truncate">
                            {move.targetPath}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 shrink-0">
                          {move.dependentFilesCount} imports to fix
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={onExecuteMoves}
              disabled={step === "executing" || selectedMoveIds.size === 0}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-purple-900/20 flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {step === "executing" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Applying Moves & Updating Imports...</span>
                </>
              ) : step === "done" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Refactor Complete!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Execute Selected Moves ({selectedMoveIds.size})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
