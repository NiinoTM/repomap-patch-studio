import React from "react";

interface BranchSelectorPillProps {
  currentBranch: string;
  isClean: boolean;
  onClick: () => void;
}

export function BranchSelectorPill({
  currentBranch,
  isClean,
  onClick,
}: BranchSelectorPillProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-2.5 py-1 rounded-md text-xs font-mono transition-colors group cursor-pointer"
      title="Open Git Branch Manager"
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isClean ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
        }`}
      />
      <span className="text-zinc-400">git:</span>
      <span className="text-zinc-100 font-semibold max-w-[140px] truncate">
        {currentBranch || "loading..."}
      </span>
      <span className="text-[10px] text-zinc-500">
        ({isClean ? "Clean" : "Dirty"})
      </span>
      <svg
        className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  );
}
