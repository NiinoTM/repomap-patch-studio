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

interface DiffBlockHeaderProps {
  block: DiffBlock;
  isCollapsed: boolean;
  isEditing: boolean;
  copiedId?: string | null;
  copiedErrorId?: string | null;
  validationErrors: string[];
  isIgnored: boolean;
  searchLinesCount: number;
  replaceLinesCount: number;
  onToggleCollapse: (id: string) => void;
  onCopyBlock: (block: DiffBlock) => void;
  onCopyBlockWithError?: (block: DiffBlock, errors: string[]) => void;
  onStartEditing: (block: DiffBlock) => void;
  onSaveEdit: () => void;
  onToggleBlock: (id: string) => void;
}

export function DiffBlockHeader({
  block,
  isCollapsed,
  isEditing,
  copiedId,
  copiedErrorId,
  validationErrors,
  isIgnored,
  searchLinesCount,
  replaceLinesCount,
  onToggleCollapse,
  onCopyBlock,
  onCopyBlockWithError,
  onStartEditing,
  onSaveEdit,
  onToggleBlock,
}: DiffBlockHeaderProps) {
  return (
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
          {block.matchedFile || block.file}
        </span>
        {block.file === "Active File" && block.matchedFile && (
          <span className="text-[10px] text-zinc-500 font-mono hidden md:inline truncate">
            (Active File)
          </span>
        )}
        <StatusBadge
          status={block.status}
          isCodeMatched={block.isCodeMatched}
          changeType={block.changeType}
        />
        {isCollapsed && (
          <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline truncate">
            ({searchLinesCount} search / {replaceLinesCount} replace lines)
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

          {onCopyBlockWithError && validationErrors.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopyBlockWithError(block, validationErrors);
              }}
              className="text-rose-400 hover:text-rose-300 p-1.5 rounded hover:bg-rose-950/50 transition-colors"
              title="Copy block with error for AI resolution"
            >
              {copiedErrorId === block.id ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              )}
            </button>
          )}

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
  );
}
