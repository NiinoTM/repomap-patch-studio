import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Copy,
  Edit2,
  Save,
  AlertTriangle,
} from "lucide-react";
import { DiffBlock } from "../../../../types/patch";
import { AcceptToggle } from "./AcceptToggle";
import { StatusBadge } from "./StatusBadge";

interface DiffBlockCardProps {
  block: DiffBlock;
  validationErrors?: string[];
  isIgnored: boolean;
  isCollapsed: boolean;
  isEditing: boolean;
  editSearch: string;
  editReplace: string;
  copiedId: string | null;
  onToggleBlock: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onCopyBlock: (block: DiffBlock) => void;
  onStartEditing: (block: DiffBlock) => void;
  onSaveEdit: () => void;
  onEditSearchChange: (value: string) => void;
  onEditReplaceChange: (value: string) => void;
}

export function DiffBlockCard({
  block,
  validationErrors = [],
  isIgnored = false,
  isCollapsed = false,
  isEditing = false,
  editSearch = "",
  editReplace = "",
  copiedId,
  onToggleBlock,
  onToggleCollapse,
  onCopyBlock,
  onStartEditing,
  onSaveEdit,
  onEditSearchChange,
  onEditReplaceChange,
}: DiffBlockCardProps) {
  if (block.type === "move") {
    return (
      <div
        className={`bg-zinc-900/30 border border-zinc-800 rounded-xl flex flex-col transition-all ${
          isIgnored ? "opacity-50 grayscale" : ""
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3 min-w-0">
            <span className="bg-violet-500/20 text-violet-400 text-[10px] px-1.5 py-0.5 rounded border border-violet-500/20 font-bold uppercase shrink-0">
              Move
            </span>
            <span className="text-xs font-mono text-zinc-400 truncate">
              {block.file}
            </span>
            <span className="text-zinc-600 shrink-0">→</span>
            <span className="text-xs font-mono text-zinc-100 font-medium truncate">
              {block.moveTo}
            </span>
            <StatusBadge
              status={block.status}
              matchLabel="Source Found"
              noMatchLabel="Source Missing"
            />
          </div>
          <AcceptToggle
            isIgnored={isIgnored}
            onToggle={() => onToggleBlock(block.id)}
          />
        </div>
        {validationErrors.length > 0 && !isIgnored && (
          <div className="bg-rose-950/40 border-t border-rose-900/50 px-4 py-2 flex flex-col space-y-1.5">
            {validationErrors.map((err, i) => (
              <div
                key={i}
                className="flex items-start text-[11px] text-rose-400/90 leading-tight"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                <span className="font-mono">{err}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const searchLines = (block.search || "").trim()
    ? (block.search || "").trim().split("\n")
    : [];
  const replaceLines = (block.replace || "").trim()
    ? (block.replace || "").trim().split("\n")
    : [];

  return (
    <div
      className={`bg-zinc-900/30 border border-zinc-800 rounded-xl flex flex-col overflow-hidden transition-all ${
        isIgnored ? "opacity-50 grayscale" : ""
      }`}
    >
      <div
        onClick={() => onToggleCollapse(block.id)}
        className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-850 transition-colors select-none group"
      >
        <div className="flex items-center space-x-2 min-w-0 pr-2">
          <button
            type="button"
            className="text-zinc-500 group-hover:text-zinc-300 transition-colors p-0.5 rounded hover:bg-zinc-800"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(block.id);
            }}
            title={isCollapsed ? "Expand block" : "Retract block"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <span className="text-xs font-mono text-zinc-200 font-medium truncate">
            {block.file}
          </span>
          <StatusBadge status={block.status} />
          {isCollapsed && (
            <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline truncate">
              ({searchLines.length} search / {replaceLines.length} replace
              lines)
            </span>
          )}
        </div>

        <div className="flex items-center shrink-0">
          <div className="flex items-center space-x-1 shrink-0 pr-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopyBlock(block);
              }}
              className="text-zinc-500 hover:text-cyan-400 p-1.5 rounded hover:bg-zinc-800 transition-colors"
              title="Copy block"
            >
              {copiedId === block.id ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            {isEditing ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveEdit();
                }}
                className="text-emerald-500 hover:text-emerald-400 p-1.5 rounded hover:bg-emerald-500/10 transition-colors"
                title="Save changes"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEditing(block);
                }}
                className="text-zinc-500 hover:text-cyan-400 p-1.5 rounded hover:bg-zinc-800 transition-colors"
                title="Edit block"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}

            <div className="w-px h-4 bg-zinc-800 mx-1"></div>
          </div>

          <AcceptToggle
            isIgnored={isIgnored}
            onToggle={() => onToggleBlock(block.id)}
          />
        </div>
      </div>

      {validationErrors.length > 0 && !isIgnored && (
        <div className="bg-rose-950/40 border-b border-rose-900/50 px-4 py-2 flex flex-col space-y-1.5">
          {validationErrors.map((err, i) => (
            <div
              key={i}
              className="flex items-start text-[11px] text-rose-400/90 leading-tight"
            >
              <AlertTriangle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span className="font-mono">{err}</span>
            </div>
          ))}
        </div>
      )}

      {isCollapsed ? (
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
      ) : isEditing ? (
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
      ) : (
        <div className="p-4 font-mono text-[11px] overflow-x-auto custom-scrollbar leading-relaxed min-w-0 w-full bg-zinc-950/50">
          <div className="text-rose-500 opacity-50 select-none font-semibold">
            {"<<<<<<< SEARCH"}
          </div>
          <div className="pl-4 text-zinc-500 whitespace-pre">
            {block.search}
          </div>
          <div className="text-emerald-500 opacity-50 select-none font-semibold">
            {"======="}
          </div>
          <div className="pl-4 text-zinc-200 whitespace-pre">
            {block.replace}
          </div>
          <div className="text-emerald-500 opacity-50 select-none font-semibold">
            {">>>>>>> REPLACE"}
          </div>
        </div>
      )}
    </div>
  );
}
