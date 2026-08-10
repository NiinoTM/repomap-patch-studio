import React, { useState } from "react";

interface CreateBranchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentBranch: string;
  branches: string[];
  onCreate: (name: string, startPoint?: string) => void;
}

export function CreateBranchDialog({
  isOpen,
  onClose,
  currentBranch,
  branches,
  onCreate,
}: CreateBranchDialogProps) {
  const [name, setName] = useState("");
  const [startPoint, setStartPoint] = useState(currentBranch);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, startPoint);
    setName("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl p-5">
        <h3 className="text-sm font-bold text-zinc-100 mb-4">
          Create New Branch
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Branch Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="feature/my-new-feature"
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Start Point (Base Branch)
            </label>
            <select
              value={startPoint}
              onChange={(e) => setStartPoint(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
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
              disabled={!name.trim()}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-zinc-950 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Create & Switch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
