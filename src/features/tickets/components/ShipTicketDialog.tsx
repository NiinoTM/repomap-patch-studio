import { useState, useEffect } from "react";
import { Ticket } from "../../../types/ticket";
import { branchApi } from "../../../api/branchApi";
import { X } from "lucide-react";

export interface ShipTicketDialogProps {
  ticket: Ticket;
  onClose: () => void;
  onConfirm: (ticket: Ticket, targetBranch: string) => void;
}

export function ShipTicketDialog({
  ticket,
  onClose,
  onConfirm,
}: ShipTicketDialogProps) {
  const [targetBranch, setTargetBranch] = useState(
    ticket.targetBranch || "main",
  );
  const [branches, setBranches] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    branchApi
      .fetchBranches()
      .then((res) => {
        if (mounted && res.success && res.branches) {
          setBranches(res.branches.map((b) => b.name));
          if (
            !ticket.targetBranch &&
            res.currentBranch &&
            res.currentBranch !== ticket.branch
          ) {
            setTargetBranch(res.currentBranch);
          }
        }
      })
      .catch((err) =>
        console.error("Failed to load branches for ship dialog:", err),
      );
    return () => {
      mounted = false;
    };
  }, [ticket]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-zinc-100">
              🚀 Ship & Merge Ticket
            </span>
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300">
              {ticket.id}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <p className="text-zinc-400">
            Merge feature branch{" "}
            <span className="font-mono text-cyan-300 font-semibold">
              {ticket.branch}
            </span>{" "}
            into target branch:
          </p>

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-zinc-400">
              Target Branch
            </label>
            <select
              value={targetBranch}
              onChange={(e) => setTargetBranch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {branches.length > 0 ? (
                branches.map((b) => (
                  <option key={b} value={b}>
                    {b} {b === "main" ? "(default)" : ""}
                  </option>
                ))
              ) : (
                <option value={targetBranch}>{targetBranch}</option>
              )}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(ticket, targetBranch)}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all cursor-pointer shadow-md shadow-emerald-950/40"
          >
            Confirm & Merge
          </button>
        </div>
      </div>
    </div>
  );
}