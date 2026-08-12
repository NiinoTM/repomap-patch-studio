import { DiffBlock } from "../../../../types/patch";
import { AcceptToggle } from "./AcceptToggle";
import { StatusBadge } from "./StatusBadge";
import { ValidationErrorBanner } from "./ValidationErrorBanner";

interface MoveBlockCardProps {
  block: DiffBlock;
  validationErrors: string[];
  isIgnored: boolean;
  copiedErrorId?: string | null;
  onToggleBlock: (id: string) => void;
  onCopyBlockWithError?: (block: DiffBlock, errors: string[]) => void;
}

export function MoveBlockCard({
  block,
  validationErrors,
  isIgnored,
  copiedErrorId,
  onToggleBlock,
  onCopyBlockWithError,
}: MoveBlockCardProps) {
  return (
    <div
      className={`bg-zinc-900/30 border border-zinc-800 rounded-xl flex flex-col transition-all ${
        isIgnored ? "opacity-50 grayscale" : ""
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3 min-w-0">
          <span className="bg-violet-500/20 text-violet-400 text-[10px] px-1.5 py-0.5 rounded border border-violet-500/20 font-bold uppercase shrink-0">
            {block.changeType === "RENAME" ? "Rename" : "Move"}
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
      {!isIgnored && (
        <ValidationErrorBanner
          block={block}
          validationErrors={validationErrors}
          copiedErrorId={copiedErrorId}
          onCopyBlockWithError={onCopyBlockWithError}
          borderClass="border-t border-rose-900/50"
        />
      )}
    </div>
  );
}
