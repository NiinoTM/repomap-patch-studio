import React, { useState, useEffect } from "react";

interface RenameBranchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  branchToRename: string | null;
  onRename: (oldName: string, newName: string) => void;
}

export function RenameBranchDialog({
  isOpen,
  onClose,
  branchToRename,
  onRename,
}: RenameBranchDialogProps) {
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (branchToRename) {
      setNewName(branchToRename);
    }
  }, [branchToRename]);

  if (!isOpen || !branchToRename) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || trimmed === branchToRename) return;
    onRename(branchToRename, trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl p-5">
        <h3 className="text-sm font-bold text-zinc-100 mb-4">
          Rename Branch:{" "}
          <span className="font-mono text-cyan-400">{branchToRename}</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              New Branch Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none"
              autoFocus
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim() || newName.trim() === branchToRename}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-zinc-950 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
