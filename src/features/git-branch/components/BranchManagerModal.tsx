import React, { useState } from "react";
import { BranchDetails } from "../../../types/branch";

interface BranchManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  branches: BranchDetails[];
  currentBranch: string;
  isClean: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectBranch: (branch: string) => void;
  onCreateOpen: () => void;
  onRenameOpen: (branch: string) => void;
  onDeleteBranch: (branch: string) => void;
  onPruneMerged?: () => void;
}

export function BranchManagerModal({
  isOpen,
  onClose,
  branches,
  currentBranch,
  isClean,
  isLoading = false,
  onRefresh,
  searchQuery,
  onSearchChange,
  onSelectBranch,
  onCreateOpen,
  onRenameOpen,
  onDeleteBranch,
  onPruneMerged,
}: BranchManagerModalProps) {
  const [filterTab, setFilterTab] = useState<"all" | "active" | "merged">("all");

  if (!isOpen) return null;

  const mergedCount = branches.filter((b) => b.isMerged).length;
  const filteredBranches = branches
    .filter((b) => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((b) => {
      if (filterTab === "active") return !b.isMerged;
      if (filterTab === "merged") return b.isMerged;
      return true;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center space-x-2">
            <svg
              className="w-5 h-5 text-cyan-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            <h2 className="text-sm font-bold text-zinc-100">
              Git Branch Manager
            </h2>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                isClean
                  ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/50"
                  : "bg-amber-950/60 text-amber-400 border border-amber-800/50"
              }`}
            >
              {isClean ? "Workspace Clean" : "Uncommitted Edits"}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-md transition-colors cursor-pointer"
                title="Refresh Git status and branches"
              >
                <svg
                  className={`w-4 h-4 ${
                    isLoading ? "animate-spin text-cyan-400" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 p-1 rounded-md transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toolbar: Search + Tabs + Create */}
        <div className="p-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between space-x-2">
          <div className="flex items-center space-x-2 flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search local branches..."
              className="w-48 bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none font-mono"
              autoFocus
            />

            {/* Filter Tabs */}
            <div className="flex items-center space-x-1 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
              <button
                onClick={() => setFilterTab("all")}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                  filterTab === "all"
                    ? "bg-zinc-800 text-zinc-100 font-bold"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                All ({branches.length})
              </button>
              <button
                onClick={() => setFilterTab("active")}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                  filterTab === "active"
                    ? "bg-zinc-800 text-zinc-100 font-bold"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Active ({branches.length - mergedCount})
              </button>
              <button
                onClick={() => setFilterTab("merged")}
                className={`px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                  filterTab === "merged"
                    ? "bg-zinc-800 text-zinc-100 font-bold"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Merged ({mergedCount})
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {mergedCount > 0 && onPruneMerged && (
              <button
                onClick={onPruneMerged}
                className="text-[10px] font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                title="Delete all branches safely merged into main"
              >
                🧹 Prune Merged ({mergedCount})
              </button>
            )}

            <button
              onClick={onCreateOpen}
              className="flex items-center space-x-1 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            >
              <span>+</span>
              <span>New Branch</span>
            </button>
          </div>
        </div>

        {/* Branch List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/50 p-2 space-y-1">
          {filteredBranches.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs font-mono">
              No matching branches found
            </div>
          ) : (
            filteredBranches.map((b) => {
              const isCurrent = b.name === currentBranch;
              return (
                <div
                  key={b.name}
                  className={`flex items-center justify-between p-2.5 rounded-lg transition-colors group ${
                    isCurrent
                      ? "bg-cyan-950/30 border border-cyan-800/30"
                      : "hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1 pr-3">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isCurrent ? "bg-cyan-400" : "bg-zinc-700"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-mono text-xs font-semibold truncate ${
                            isCurrent ? "text-cyan-300" : "text-zinc-200"
                          }`}
                        >
                          {b.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] bg-cyan-900/50 text-cyan-300 px-1.5 py-0.5 rounded font-mono">
                            Current
                          </span>
                        )}
                        {b.isMerged && !isCurrent && (
                          <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800/50 px-1.5 py-0.2 rounded font-mono">
                            Merged
                          </span>
                        )}
                        {b.upstream && (
                          <span className="text-[9px] text-zinc-500 font-mono truncate">
                            → {b.upstream}
                          </span>
                        )}
                      </div>
                      {b.commitMessage && (
                        <div className="text-[11px] text-zinc-500 truncate mt-0.5 font-mono">
                          <span className="text-zinc-600">{b.commitHash}</span>{" "}
                          — {b.commitMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 shrink-0">
                    {!isCurrent && (
                      <button
                        onClick={() => onSelectBranch(b.name)}
                        className="bg-zinc-800 hover:bg-cyan-600 hover:text-zinc-950 text-zinc-300 px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer"
                      >
                        Checkout
                      </button>
                    )}

                    <button
                      onClick={() => onRenameOpen(b.name)}
                      className="text-zinc-500 hover:text-zinc-200 p-1.5 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Rename branch"
                    >
                      ✎
                    </button>

                    {!isCurrent && (
                      <button
                        onClick={() => onDeleteBranch(b.name)}
                        className="text-zinc-500 hover:text-rose-400 p-1.5 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Delete branch"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-800 text-[11px] text-zinc-500 flex justify-between items-center">
          <span>Total branches: {branches.length}</span>
          <span className="font-mono text-[10px]">Press Esc to dismiss</span>
        </div>
      </div>
    </div>
  );
}
