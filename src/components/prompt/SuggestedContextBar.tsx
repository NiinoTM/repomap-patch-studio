import React from "react";
import { Sparkles, Globe, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

export interface SuggestedFile {
  filePath: string;
  type: "parent" | "child" | "hub" | "api";
  importedActiveFiles: string[];
  importingActiveFiles: string[];
  tooltip: string;
}

interface SuggestedContextBarProps {
  suggestedFiles: SuggestedFile[];
  onAddAllSuggestions: () => void;
  onToggleSuggestion: (filePath: string) => void;
}

export function SuggestedContextBar({
  suggestedFiles,
  onAddAllSuggestions,
  onToggleSuggestion,
}: SuggestedContextBarProps) {
  if (suggestedFiles.length === 0) return null;

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-2.5 space-y-2 animate-fadeIn shrink-0">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-200 font-semibold flex items-center">
          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
          Suggested Context ({suggestedFiles.length})
        </span>
        <button
          onClick={onAddAllSuggestions}
          className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-2 py-0.5 rounded transition-colors cursor-pointer"
        >
          + Add All
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar">
        {suggestedFiles.map((item) => {
          const fileName = item.filePath.split("/").pop() || item.filePath;

          if (item.type === "api") {
            return (
              <button
                key={item.filePath}
                onClick={() => onToggleSuggestion(item.filePath)}
                title={item.tooltip}
                className="text-[10px] bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/70 px-1.5 py-0.5 rounded flex items-center space-x-1 cursor-pointer transition-colors shadow-sm"
              >
                <Globe className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="font-mono truncate max-w-[130px]">
                  {fileName}
                </span>
              </button>
            );
          }

          if (item.type === "parent") {
            return (
              <button
                key={item.filePath}
                onClick={() => onToggleSuggestion(item.filePath)}
                title={item.tooltip}
                className="text-[10px] bg-purple-950/40 border border-purple-500/40 text-purple-300 hover:bg-purple-900/60 px-1.5 py-0.5 rounded flex items-center space-x-1 cursor-pointer transition-colors"
              >
                <ArrowUp className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="font-mono truncate max-w-[130px]">
                  {fileName}
                </span>
              </button>
            );
          }

          if (item.type === "child") {
            return (
              <button
                key={item.filePath}
                onClick={() => onToggleSuggestion(item.filePath)}
                title={item.tooltip}
                className="text-[10px] bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 px-1.5 py-0.5 rounded flex items-center space-x-1 cursor-pointer transition-colors"
              >
                <ArrowDown className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="font-mono truncate max-w-[130px]">
                  {fileName}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.filePath}
              onClick={() => onToggleSuggestion(item.filePath)}
              title={item.tooltip}
              className="text-[10px] bg-gradient-to-r from-purple-950/50 to-cyan-950/50 border border-indigo-500/50 text-indigo-200 hover:from-purple-900/70 hover:to-cyan-900/70 px-1.5 py-0.5 rounded flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <ArrowUpDown className="w-3 h-3 text-indigo-300 shrink-0" />
              <span className="font-mono truncate max-w-[130px]">
                {fileName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}