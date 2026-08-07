import React, { useState } from "react";

interface HeaderProps {
  onUndoSuccess?: () => void;
  repoPath: string;
  onChangeRepo: () => void;
}

export function Header({ onUndoSuccess, repoPath, onChangeRepo }: HeaderProps) {
  const [isUndoing, setIsUndoing] = useState(false);

  // 1. The Undo Handler (calls the /api/undo endpoint on your Express backend)
  const handleUndo = async () => {
    if (
      !confirm(
        "Are you sure you want to hard reset to the previous Git commit? Uncommitted changes will be lost.",
      )
    ) {
      return;
    }

    setIsUndoing(true);
    try {
      const response = await fetch("/api/undo", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        alert("🔄 Git reset successful!");
        if (onUndoSuccess) onUndoSuccess();
      } else {
        alert("❌ Error resetting: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert(
        "❌ Failed to reach backend server. Make sure node server.js is running.",
      );
    } finally {
      setIsUndoing(false);
    }
  };

  return (
    <header className="h-12 border-b border-zinc-800 flex items-center justify-between px-4 bg-zinc-950 shrink-0">
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

        <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-xs max-w-[300px]">
          <span className="text-zinc-500 truncate" title={repoPath}>
            {repoPath}
          </span>
          <button
            onClick={onChangeRepo}
            className="text-cyan-500 hover:text-cyan-400 font-medium px-1 shrink-0"
          >
            Change
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
          <span className="text-[11px] font-mono text-zinc-400">
            git: <span className="text-emerald-500">main</span> (Clean)
          </span>
        </div>

        {/* 2. Connected onClick={handleUndo} to the Undo Button */}
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
    </header>
  );
}
