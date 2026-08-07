import React, { useState, useEffect } from "react";

interface FolderBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
}

function FolderBrowserModal({ isOpen, onClose, onSelect }: FolderBrowserProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setLoading(true);
    const params = new URLSearchParams();
    if (currentPath) params.set("path", currentPath);
    fetch(`/api/browse?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setEntries(data.entries);
          if (!currentPath && data.path) setCurrentPath(data.path);
        } else {
          setError(data.error || "Failed to load directories");
          setEntries([]);
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [isOpen, currentPath]);

  if (!isOpen) return null;

  const navigateTo = (dir: string) => {
    const sep = currentPath.endsWith("/") || currentPath.endsWith("\\") ? "" : "/";
    setCurrentPath(currentPath + sep + dir);
  };

  const goUp = () => {
    const parent = currentPath.split("/").slice(0, -1).join("/") || "";
    setCurrentPath(parent || "");
  };

  const selectFolder = () => {
    onSelect(currentPath);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-[500px] max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-zinc-100">Select Repository Folder</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-lg leading-none px-2"
          >
            ✕
          </button>
        </div>
        <div className="p-2 border-b border-zinc-800 flex items-center space-x-2 text-xs">
          <button
            onClick={goUp}
            disabled={!currentPath}
            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 disabled:opacity-50"
          >
            ↑ Up
          </button>
          <span className="text-zinc-400 truncate flex-1" title={currentPath}>
            {currentPath || "/"}
          </span>
          <button
            onClick={selectFolder}
            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-white font-medium"
          >
            Select
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 text-sm">
          {loading && <div className="text-zinc-500 p-4">Loading...</div>}
          {error && <div className="text-rose-400 p-4">{error}</div>}
          {!loading && !error && entries.length === 0 && (
            <div className="text-zinc-500 p-4">No subdirectories</div>
          )}
          {entries.map((entry) => (
            <button
              key={entry}
              onClick={() => navigateTo(entry)}
              className="w-full text-left px-3 py-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center space-x-2"
            >
              <span className="text-cyan-400">📁</span>
              <span>{entry}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface HeaderProps {
  onUndoSuccess?: () => void;
  repoPath: string;
  onChangeRepo: (newPath: string) => void;
  tokenStats?: {
    total: number;
    map: number;
    files: number;
    selectedCount: number;
  };
}

export function Header({
  onUndoSuccess,
  repoPath,
  onChangeRepo,
  tokenStats,
}: HeaderProps) {
  const [isUndoing, setIsUndoing] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);

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

  const TARGET_BUDGET = 30000;
  const budgetPercentage = Math.min(
    100,
    Math.round(((tokenStats?.total || 0) / TARGET_BUDGET) * 100),
  );

  let budgetStatus = {
    label: "Optimal Focus",
    bg: "bg-emerald-500",
    text: "text-emerald-400",
  };
  if (tokenStats) {
    if (tokenStats.total > 15000 && tokenStats.total <= 30000)
      budgetStatus = {
        label: "Heavy Context",
        bg: "bg-amber-500",
        text: "text-amber-400",
      };
    else if (tokenStats.total > 30000)
      budgetStatus = {
        label: "Context Overload",
        bg: "bg-rose-500",
        text: "text-rose-400",
      };
  }

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

        <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-xs max-w-[300px]">
          <span className="text-zinc-500 truncate" title={repoPath}>
            {repoPath}
          </span>
          <button
            onClick={() => setShowBrowser(true)}
            className="text-cyan-500 hover:text-cyan-400 font-medium px-1 shrink-0"
          >
            Change
          </button>
        </div>
      </div>

      {/* LIVE TOKEN BUDGET BAR (Centered) */}
      {tokenStats && (
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col justify-center space-y-1 bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-1 w-[360px] shadow-sm">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <span
                className={`w-1.5 h-1.5 rounded-full ${budgetStatus.bg} animate-pulse`}
              />
              <span className="text-[11px] font-semibold text-zinc-200">
                Token Budget
              </span>
              <span
                className={`text-[9px] font-medium px-1.5 py-0.5 rounded bg-zinc-800 ${budgetStatus.text}`}
              >
                {budgetStatus.label}
              </span>
            </div>
            <span className="font-mono text-[10px] font-bold text-zinc-100">
              {tokenStats.total.toLocaleString()}{" "}
              <span className="text-zinc-500 font-normal">/ 30k</span>
            </span>
          </div>

          <div className="w-full bg-zinc-800/80 h-1 rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-300 ${budgetStatus.bg}`}
              style={{ width: `${budgetPercentage}%` }}
            />
          </div>

          <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
            <span>Map: {tokenStats.map.toLocaleString()} tks</span>
            <span>
              Files ({tokenStats.selectedCount}):{" "}
              {tokenStats.files.toLocaleString()} tks
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
          <span className="text-[11px] font-mono text-zinc-400">
            git: <span className="text-emerald-500">main</span> (Clean)
          </span>
        </div>

        {}
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

      <FolderBrowserModal
        isOpen={showBrowser}
        onClose={() => setShowBrowser(false)}
        onSelect={(path) => {
          onChangeRepo(path);
          setShowBrowser(false);
        }}
      />
    </header>
  );
}
