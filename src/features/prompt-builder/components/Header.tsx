import React, { useState } from "react";
import { useHeaderActions } from "../hooks/useHeaderActions";
import { useBranchManager } from "../../git-branch/hooks/useBranchManager";
import { RemediationModal } from "../../project-remediation/components/RemediationModal";
import { BranchSelectorPill } from "../../git-branch/components/BranchSelectorPill";
import { BranchManagerModal } from "../../git-branch/components/BranchManagerModal";
import { CreateBranchDialog } from "../../git-branch/components/CreateBranchDialog";
import { RenameBranchDialog } from "../../git-branch/components/RenameBranchDialog";
import { DirtyStateWarningModal } from "../../git-branch/components/DirtyStateWarningModal";
import { ActiveTicketPill } from "../../tickets/components/ActiveTicketPill";
import { TicketManagerModal } from "../../tickets/components/TicketManagerModal";
import { CreateTicketDialog } from "../../tickets/components/CreateTicketDialog";
import { useTickets } from "../../tickets/hooks/useTickets";
import { Ticket } from "../../../types/ticket";
import { extractAvailableScopes } from "../utils/scopeFilter";

interface HeaderProps {
  onUndoSuccess?: () => void;
  repoPath: string;
  repoFiles?: string[];
  onChangeRepo: (newPath: string) => void;
  tokenStats?: {
    total: number;
    map: number;
    files: number;
    selectedCount: number;
  };
  activeTicket?: Ticket | null;
  onActiveTicketChange?: (ticket: Ticket | null) => void;
  activeScope?: string;
  onActiveScopeChange?: (scope: string) => void;
}

interface TokenBudgetWidgetProps {
  tokenStats: {
    total: number;
    map: number;
    files: number;
    selectedCount: number;
  };
  activeScope: string;
  availableScopes: string[];
  onActiveScopeChange?: (scope: string) => void;
}

function TokenBudgetWidget({
  tokenStats,
  activeScope,
  availableScopes,
  onActiveScopeChange,
}: TokenBudgetWidgetProps) {
  let statusBg = "bg-emerald-500";
  if (tokenStats.total > 30000) {
    statusBg = "bg-rose-500";
  } else if (tokenStats.total > 15000) {
    statusBg = "bg-amber-500";
  }

  const formattedTotal =
    tokenStats.total >= 1000
      ? `${(tokenStats.total / 1000).toFixed(1)}k`
      : String(tokenStats.total);

  return (
    <div className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-2.5 bg-zinc-900/95 border border-zinc-800 rounded-full px-3 py-1 shadow-sm shrink-0 z-10">
      <div
        className="flex items-center space-x-1.5 shrink-0"
        title={`Total Tokens: ${tokenStats.total.toLocaleString()} / 30,000 (Map: ${tokenStats.map.toLocaleString()} tks)`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${statusBg} ${
            tokenStats.total > 15000 ? "animate-pulse" : ""
          }`}
        />
        <span className="font-mono text-[10px] font-bold text-zinc-200">
          {formattedTotal}
          <span className="text-zinc-500 font-normal">/30k</span>
        </span>
      </div>

      <div className="h-3 w-[1px] bg-zinc-800 shrink-0" />

      <div className="flex items-center space-x-1 shrink-0">
        <span className="text-[10px] text-zinc-500 font-medium">Scope:</span>
        <select
          value={activeScope}
          onChange={(e) => onActiveScopeChange?.(e.target.value)}
          className="bg-zinc-950 text-cyan-400 text-[10px] font-mono rounded px-1.5 py-0.5 border border-zinc-800 focus:outline-none focus:border-cyan-500 cursor-pointer max-w-[130px] truncate"
          title="Filter Repo Map symbols to this domain (works on any size project)"
        >
          <option value="all">all (full repo)</option>
          {availableScopes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {activeScope !== "all" && (
        <button
          onClick={() => onActiveScopeChange?.("all")}
          className="text-[10px] text-zinc-500 hover:text-rose-400 px-1 py-0.2 rounded transition-colors cursor-pointer"
          title="Reset scope to full repo"
        >
          ✕
        </button>
      )}

      {tokenStats.total > 15000 && activeScope === "all" && availableScopes.length > 0 && (
        <button
          onClick={() => onActiveScopeChange?.(availableScopes[0])}
          className="text-[9px] font-semibold text-amber-300 bg-amber-950/60 border border-amber-500/30 px-1.5 py-0.5 rounded-full hover:bg-amber-900/50 transition-colors cursor-pointer shrink-0"
          title="Context is heavy. Click to scope to primary domain."
        >
          ⚡ Scope
        </button>
      )}
    </div>
  );
}

export function Header({
  onUndoSuccess,
  repoPath,
  repoFiles = [],
  onChangeRepo,
  tokenStats,
  activeTicket,
  onActiveTicketChange,
  activeScope = "all",
  onActiveScopeChange,
}: HeaderProps) {
  const { isUndoing, handleUndo, handleChangeRepo } = useHeaderActions({
    onUndoSuccess,
    onChangeRepo,
  });

  const branchManager = useBranchManager({ onBranchChange: onUndoSuccess });
  const ticketManager = useTickets(onUndoSuccess);
  const [isRemediationOpen, setIsRemediationOpen] = useState(false);

  // Manual path entry — an alternative to the native OS folder dialog.
  // Useful under RDP/headless setups where ShowDialog() can hang or fail
  // to render, but kept available generally as a faster option too.
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [manualPath, setManualPath] = useState(repoPath);

  const startManualEdit = () => {
    setManualPath(repoPath);
    setIsEditingPath(true);
  };

  const submitManualPath = () => {
    const trimmed = manualPath.trim();
    if (trimmed && trimmed !== repoPath) {
      onChangeRepo(trimmed);
    }
    setIsEditingPath(false);
  };

  const cancelManualEdit = () => {
    setManualPath(repoPath);
    setIsEditingPath(false);
  };

  const handlePathKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      submitManualPath();
    } else if (e.key === "Escape") {
      cancelManualEdit();
    }
  };

  const availableScopes = extractAvailableScopes(repoFiles);

  return (
    <header className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950 shrink-0 relative">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-cyan-500 rounded flex items-center justify-center font-bold text-zinc-950">
            R
          </div>
          <span className="font-bold text-zinc-100 tracking-tight text-sm">
            RepoMap Patch Studio
          </span>
        </div>

        <div className="h-4 w-[1px] bg-zinc-800 mx-2"></div>

        <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-xs max-w-[340px]">
          {isEditingPath ? (
            <>
              <input
                autoFocus
                type="text"
                value={manualPath}
                onChange={(e) => setManualPath(e.target.value)}
                onKeyDown={handlePathKeyDown}
                onBlur={cancelManualEdit}
                placeholder="Type or paste a folder path..."
                className="bg-zinc-950 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200 text-xs w-[220px] focus:outline-none focus:border-cyan-500"
              />
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={submitManualPath}
                className="text-emerald-500 hover:text-emerald-400 font-medium px-1 shrink-0"
                title="Use this path (Enter)"
              >
                ✓
              </button>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={cancelManualEdit}
                className="text-zinc-500 hover:text-zinc-400 font-medium px-1 shrink-0"
                title="Cancel (Esc)"
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <span className="text-zinc-500 truncate" title={repoPath}>
                {repoPath}
              </span>
              <button
                onClick={handleChangeRepo}
                className="text-cyan-500 hover:text-cyan-400 font-medium px-1 shrink-0"
                title="Browse using the native OS folder dialog"
              >
                Browse
              </button>
              <button
                onClick={startManualEdit}
                className="text-cyan-500 hover:text-cyan-400 font-medium px-1 shrink-0"
                title="Type a folder path manually"
              >
                Type path
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => setIsRemediationOpen(true)}
          className="flex items-center space-x-1.5 bg-gradient-to-r from-purple-950/50 to-cyan-950/50 border border-purple-500/30 hover:border-purple-500/60 text-purple-300 px-2.5 py-1 rounded text-xs font-medium transition-all shadow-sm cursor-pointer shrink-0"
          title="Open Project Remediation & Governance Studio"
        >
          <span className="text-xs">✨</span>
          <span>Remediate Architecture</span>
        </button>
      </div>

      {tokenStats && (
        <TokenBudgetWidget
          tokenStats={tokenStats}
          activeScope={activeScope}
          availableScopes={availableScopes}
          onActiveScopeChange={onActiveScopeChange}
        />
      )}

      <div className="flex items-center space-x-3">
        <ActiveTicketPill
          activeTicket={activeTicket || ticketManager.activeTicket}
          onClick={() => ticketManager.setIsManagerOpen(true)}
        />

        <BranchSelectorPill
          currentBranch={branchManager.currentBranch}
          isClean={branchManager.isClean}
          onClick={() => branchManager.setIsManagerOpen(true)}
        />

        <BranchManagerModal
          isOpen={branchManager.isManagerOpen}
          onClose={() => branchManager.setIsManagerOpen(false)}
          branches={branchManager.branches}
          currentBranch={branchManager.currentBranch}
          isClean={branchManager.isClean}
          isLoading={branchManager.isLoading}
          onRefresh={branchManager.refreshBranches}
          onPruneMerged={branchManager.pruneMergedBranches}
          searchQuery={branchManager.searchQuery}
          onSearchChange={branchManager.setSearchQuery}
          onSelectBranch={(b) => branchManager.switchBranch(b)}
          onCreateOpen={() => branchManager.setIsCreateOpen(true)}
          onRenameOpen={(b) => branchManager.setBranchToRename(b)}
          onDeleteBranch={(b) => branchManager.deleteBranch(b)}
        />

        <CreateBranchDialog
          isOpen={branchManager.isCreateOpen}
          onClose={() => branchManager.setIsCreateOpen(false)}
          currentBranch={branchManager.currentBranch}
          branches={branchManager.allBranches.map((b) => b.name)}
          onCreate={branchManager.createBranch}
        />

        <RenameBranchDialog
          isOpen={Boolean(branchManager.branchToRename)}
          onClose={() => branchManager.setBranchToRename(null)}
          branchToRename={branchManager.branchToRename}
          onRename={branchManager.renameBranch}
        />

        <DirtyStateWarningModal
          isOpen={Boolean(branchManager.dirtyTargetBranch)}
          targetBranch={branchManager.dirtyTargetBranch}
          onClose={() => branchManager.setDirtyTargetBranch(null)}
          onStashAndSwitch={branchManager.stashAndSwitch}
          onForceSwitch={() => {
            if (branchManager.dirtyTargetBranch) {
              branchManager.switchBranch(branchManager.dirtyTargetBranch, true);
            }
          }}
        />

        <button
          onClick={handleUndo}
          disabled={isUndoing}
          className="flex items-center space-x-2 bg-rose-950/30 border border-rose-500/30 text-rose-500 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-rose-500/10 transition-colors group relative disabled:opacity-50"
          title="git reset --hard HEAD~1"
        >
          <span>{isUndoing ? "Undoing..." : "Undo Last Edit (git reset)"}</span>
          <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-zinc-800 text-zinc-300 text-[10px] rounded border border-zinc-700 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
            Hard reset to previous commit. Uncommitted changes will be lost.
          </div>
        </button>
      </div>

      <RemediationModal
        isOpen={isRemediationOpen}
        onClose={() => setIsRemediationOpen(false)}
      />

      <TicketManagerModal
        isOpen={ticketManager.isManagerOpen}
        onClose={() => ticketManager.setIsManagerOpen(false)}
        tickets={ticketManager.tickets}
        activeTicketId={
          activeTicket ? activeTicket.id : ticketManager.activeTicketId
        }
        onSelectActive={(id) => {
          ticketManager.setActiveTicketId(id);
          const found = ticketManager.tickets.find((t) => t.id === id) || null;
          onActiveTicketChange?.(found);
        }}
        onStatusChange={ticketManager.updateStatus}
        onStartBranch={ticketManager.startTicketBranch}
        onShipTicket={(t) =>
          ticketManager.shipTicket(t, () => {
            onUndoSuccess?.();
            branchManager.refreshBranches();
          })
        }
        onDeleteTicket={ticketManager.deleteTicket}
        onCreateOpen={() => ticketManager.setIsCreateOpen(true)}
      />

      <CreateTicketDialog
        isOpen={ticketManager.isCreateOpen}
        onClose={() => ticketManager.setIsCreateOpen(false)}
        availableScopes={extractAvailableScopes(repoFiles)}
        onCreate={(data) => {
          ticketManager.createTicket(data).then((created) => {
            if (created) onActiveTicketChange?.(created);
          });
        }}
      />
    </header>
  );
}
