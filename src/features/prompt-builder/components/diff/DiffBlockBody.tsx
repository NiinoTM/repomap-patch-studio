import { useMemo } from "react";
import { DiffBlock, DiffViewMode } from "../../../../types/patch";
import { computeLineDiff } from "../../utils/lineDiff";

interface DiffBlockBodyProps {
  block: DiffBlock;
  viewMode?: DiffViewMode;
  isCollapsed: boolean;
  isEditing: boolean;
  editSearch: string;
  editReplace: string;
  searchLines: string[];
  replaceLines: string[];
  onToggleCollapse: (id: string) => void;
  onEditSearchChange: (value: string) => void;
  onEditReplaceChange: (value: string) => void;
}

export function DiffBlockBody({
  block,
  viewMode = "unified",
  isCollapsed,
  isEditing,
  editSearch,
  editReplace,
  searchLines,
  replaceLines,
  onToggleCollapse,
  onEditSearchChange,
  onEditReplaceChange,
}: DiffBlockBodyProps) {
  const diffLines = useMemo(() => {
    if (viewMode !== "unified") return [];
    return computeLineDiff(block.search || "", block.replace || "");
  }, [viewMode, block.search, block.replace]);
  if (isCollapsed) {
    return (
      <div
        onClick={() => onToggleCollapse(block.id)}
        className="px-4 py-2 bg-zinc-950/40 text-[11px] font-mono text-zinc-500 flex items-center justify-between cursor-pointer hover:bg-zinc-900/40 transition-colors border-t border-zinc-800/30 select-none"
      >
        <span className="truncate italic text-zinc-400/80">
          {searchLines[0]
            ? searchLines[0]
            : replaceLines[0]
              ? replaceLines[0]
              : "Empty block content"}
        </span>
        <span className="text-[10px] text-cyan-500/80 font-sans hover:underline ml-2 shrink-0">
          Click to expand
        </span>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="p-4 bg-zinc-950/50 flex flex-col space-y-4 border-t border-zinc-800/50">
        <div className="flex flex-col space-y-1.5">
          <label className="text-[10px] text-rose-400/80 uppercase font-bold tracking-wider flex items-center">
            <span className="text-rose-500/50 mr-2">{"<<<<<<< SEARCH"}</span>
          </label>
          <textarea
            value={editSearch}
            onChange={(e) => onEditSearchChange(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded p-3 text-[11px] font-mono text-zinc-400 h-32 custom-scrollbar focus:border-rose-500/50 focus:outline-none resize-y"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col space-y-1.5">
          <label className="text-[10px] text-emerald-400/80 uppercase font-bold tracking-wider flex items-center">
            <span className="text-emerald-500/50 mr-2">
              {"======="} (REPLACE)
            </span>
          </label>
          <textarea
            value={editReplace}
            onChange={(e) => onEditReplaceChange(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded p-3 text-[11px] font-mono text-zinc-200 h-40 custom-scrollbar focus:border-emerald-500/50 focus:outline-none resize-y"
            spellCheck={false}
          />
        </div>
      </div>
    );
  }

  if (viewMode === "unified") {
    return (
      <div className="font-mono text-[11px] overflow-x-auto custom-scrollbar leading-relaxed min-w-0 w-full bg-zinc-950/60 divide-y divide-zinc-900/30">
        {diffLines.length === 0 ? (
          <div className="p-4 text-zinc-500 italic text-center">
            No line changes in this block
          </div>
        ) : (
          diffLines.map((line, idx) => {
            if (line.type === "added") {
              return (
                <div
                  key={idx}
                  className="flex items-stretch bg-emerald-950/25 text-emerald-300 hover:bg-emerald-950/40 border-l-2 border-emerald-500/70 transition-colors"
                >
                  <span className="w-10 shrink-0 select-none text-right pr-2 py-0.5 text-[10px] text-emerald-500/40 font-mono">
                    {line.newLineNumber ?? ""}
                  </span>
                  <span className="w-5 shrink-0 select-none text-center py-0.5 text-emerald-400 font-bold">
                    +
                  </span>
                  <span className="flex-1 py-0.5 pr-4 whitespace-pre font-mono">
                    {line.text}
                  </span>
                </div>
              );
            }
            if (line.type === "removed") {
              return (
                <div
                  key={idx}
                  className="flex items-stretch bg-rose-950/25 text-rose-300 hover:bg-rose-950/40 border-l-2 border-rose-500/70 transition-colors"
                >
                  <span className="w-10 shrink-0 select-none text-right pr-2 py-0.5 text-[10px] text-rose-500/40 font-mono">
                    {line.oldLineNumber ?? ""}
                  </span>
                  <span className="w-5 shrink-0 select-none text-center py-0.5 text-rose-400 font-bold">
                    -
                  </span>
                  <span className="flex-1 py-0.5 pr-4 whitespace-pre font-mono">
                    {line.text}
                  </span>
                </div>
              );
            }
            return (
              <div
                key={idx}
                className="flex items-stretch text-zinc-400 hover:bg-zinc-900/30 transition-colors"
              >
                <span className="w-10 shrink-0 select-none text-right pr-2 py-0.5 text-[10px] text-zinc-600 font-mono">
                  {line.newLineNumber ?? line.oldLineNumber ?? ""}
                </span>
                <span className="w-5 shrink-0 select-none text-center py-0.5 text-zinc-600">
                  {" "}
                </span>
                <span className="flex-1 py-0.5 pr-4 whitespace-pre font-mono text-zinc-400">
                  {line.text}
                </span>
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="p-4 font-mono text-[11px] overflow-x-auto custom-scrollbar leading-relaxed min-w-0 w-full bg-zinc-950/50">
      <div className="text-rose-500 opacity-50 select-none font-semibold">
        {"<<<<<<< SEARCH"}
      </div>
      <div className="pl-4 text-zinc-500 whitespace-pre">{block.search}</div>
      <div className="text-emerald-500 opacity-50 select-none font-semibold">
        {"======="}
      </div>
      <div className="pl-4 text-zinc-200 whitespace-pre">{block.replace}</div>
      <div className="text-emerald-500 opacity-50 select-none font-semibold">
        {">>>>>>> REPLACE"}
      </div>
    </div>
  );
}
