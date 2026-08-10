import React from "react";

interface DirtyStateWarningModalProps {
  isOpen: boolean;
  targetBranch: string | null;
  onClose: () => void;
  onStashAndSwitch: () => void;
  onForceSwitch: () => void;
}

export function DirtyStateWarningModal({
  isOpen,
  targetBranch,
  onClose,
  onStashAndSwitch,
  onForceSwitch,
}: DirtyStateWarningModalProps) {
  if (!isOpen || !targetBranch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-amber-800/60 rounded-xl w-full max-w-md shadow-2xl p-5">
        <div className="flex items-center space-x-3 text-amber-400 mb-3">
          <span className="text-xl">⚠️</span>
          <h3 className="text-sm font-bold text-zinc-100">
            Uncommitted Changes Detected
          </h3>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed mb-4">
          You have dirty or uncommitted changes in your workspace. How would you
          like to handle them before switching to{" "}
          <span className="font-mono text-cyan-400 font-semibold">
            {targetBranch}
          </span>
          ?
        </p>

        <div className="space-y-2">
          <button
            onClick={onStashAndSwitch}
            className="w-full text-left bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 p-3 rounded-lg transition-colors group cursor-pointer"
          >
            <div className="text-xs font-bold text-zinc-100 group-hover:text-cyan-300">
              📦 Stash Changes & Switch
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Saves current workspace modifications into Git stash before
              checking out.
            </div>
          </button>

          <button
            onClick={onForceSwitch}
            className="w-full text-left bg-rose-950/30 hover:bg-rose-900/40 border border-rose-800/40 p-3 rounded-lg transition-colors group cursor-pointer"
          >
            <div className="text-xs font-bold text-rose-300">
              ⚡ Force Checkout
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              Attempt to switch branches directly without stashing (may carry
              edits over).
            </div>
          </button>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
