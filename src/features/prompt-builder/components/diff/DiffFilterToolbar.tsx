import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  FoldVertical,
  GitCompare,
  UnfoldVertical,
  XCircle,
} from "lucide-react";
import { DiffViewMode } from "../../../../types/patch";

export type FilterMode =
  "all" | "active" | "matched" | "not-matched" | "errors" | "ignored";

interface DiffFilterToolbarProps {
  parsedBlocksCount: number;
  activeCount: number;
  matchCount: number;
  noMatchCount: number;
  ignoredCount: number;
  validationErrorCount: number;
  isValidating: boolean;
  filterMode: FilterMode;
  onSelectFilter: (mode: FilterMode) => void;
  viewMode?: DiffViewMode;
  onSelectViewMode?: (mode: DiffViewMode) => void;
  allCollapsed: boolean;
  onToggleAllCollapse: () => void;
  pastedContent: string;
  onClear: () => void;
}

export function DiffFilterToolbar({
  parsedBlocksCount,
  activeCount,
  matchCount,
  noMatchCount,
  ignoredCount,
  validationErrorCount,
  isValidating,
  filterMode,
  onSelectFilter,
  viewMode = "unified",
  onSelectViewMode,
  allCollapsed,
  onToggleAllCollapse,
  pastedContent,
  onClear,
}: DiffFilterToolbarProps) {
  return (
    <div className="flex items-center justify-between bg-zinc-900 p-2 rounded-lg border border-zinc-800 flex-wrap gap-2">
      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
        {parsedBlocksCount > 0 && (
          <>
            <button
              type="button"
              onClick={() => onSelectFilter("all")}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                filterMode === "all"
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-400 ring-1 ring-cyan-400/50"
                  : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20"
              }`}
              title="Show all detected diff blocks"
            >
              {parsedBlocksCount} DETECTED
            </button>

            <button
              type="button"
              onClick={() =>
                onSelectFilter(filterMode === "active" ? "all" : "active")
              }
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                filterMode === "active"
                  ? "bg-blue-500/20 text-blue-300 border-blue-400 ring-1 ring-blue-400/50"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"
              }`}
              title="Show active (non-ignored) diff blocks"
            >
              {activeCount} ACTIVE
            </button>

            <button
              type="button"
              onClick={() =>
                onSelectFilter(filterMode === "matched" ? "all" : "matched")
              }
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 border transition-colors cursor-pointer ${
                filterMode === "matched"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400 ring-1 ring-emerald-400/50"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
              }`}
              title="Show matched diff blocks"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{matchCount} MATCHED</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onSelectFilter(
                  filterMode === "not-matched" ? "all" : "not-matched",
                )
              }
              className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 border transition-colors cursor-pointer ${
                filterMode === "not-matched"
                  ? "bg-rose-500/20 text-rose-300 border-rose-400 ring-1 ring-rose-400/50"
                  : noMatchCount > 0
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                    : "bg-zinc-800/80 text-zinc-500 border-zinc-700/50 hover:bg-zinc-800"
              }`}
              title="Show unmatched diff blocks"
            >
              <XCircle
                className={`w-3 h-3 ${
                  noMatchCount > 0 ? "text-rose-400" : "text-zinc-500"
                }`}
              />
              <span>{noMatchCount} NOT FOUND</span>
            </button>

            {ignoredCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  onSelectFilter(filterMode === "ignored" ? "all" : "ignored")
                }
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                  filterMode === "ignored"
                    ? "bg-amber-500/20 text-amber-300 border-amber-400 ring-1 ring-amber-400/50"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                }`}
                title="Show ignored diff blocks"
              >
                {ignoredCount} IGNORED
              </button>
            )}

            {isValidating && (
              <div className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1">
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span>VALIDATING...</span>
              </div>
            )}

            {validationErrorCount > 0 && !isValidating && (
              <button
                type="button"
                onClick={() =>
                  onSelectFilter(filterMode === "errors" ? "all" : "errors")
                }
                className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 border transition-colors cursor-pointer ${
                  filterMode === "errors"
                    ? "bg-rose-500/20 text-rose-300 border-rose-400 ring-1 ring-rose-400/50"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                }`}
                title="Show diff blocks with errors"
              >
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>{validationErrorCount} ERRORS</span>
              </button>
            )}
          </>
        )}
        <span className="text-xs text-zinc-400">
          Paste AI response below to review diffs
        </span>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {parsedBlocksCount > 0 && onSelectViewMode && (
          <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
            <button
              type="button"
              onClick={() => onSelectViewMode("in-out")}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
                viewMode === "in-out"
                  ? "bg-zinc-800 text-cyan-300 font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Show In / Out view (Search & Replace blocks)"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>In / Out</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectViewMode("unified")}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1.5 ${
                viewMode === "unified"
                  ? "bg-zinc-800 text-cyan-300 font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Show Lines view (added, removed, and changed lines)"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Line Diff</span>
            </button>
          </div>
        )}

        {parsedBlocksCount > 0 && (
          <button
            onClick={onToggleAllCollapse}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center space-x-1 border border-zinc-700/50"
            title={
              allCollapsed
                ? "Expand all diff blocks"
                : "Retract all diff blocks"
            }
          >
            {allCollapsed ? (
              <>
                <UnfoldVertical className="w-3.5 h-3.5" />
                <span>Expand All</span>
              </>
            ) : (
              <>
                <FoldVertical className="w-3.5 h-3.5" />
                <span>Retract All</span>
              </>
            )}
          </button>
        )}
        {pastedContent && (
          <button
            onClick={onClear}
            className="text-xs bg-zinc-800 px-3 py-1 rounded text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer border border-zinc-700/50"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
