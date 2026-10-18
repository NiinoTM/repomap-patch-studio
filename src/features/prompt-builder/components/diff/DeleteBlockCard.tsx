import { DiffBlock } from "../../../../types/patch";
import { AcceptToggle } from "./AcceptToggle";
import { StatusBadge } from "./StatusBadge";
import { ValidationErrorBanner } from "./ValidationErrorBanner";

interface DeleteBlockCardProps {
  block: DiffBlock;
  validationErrors: string[];
  isIgnored: boolean;
  copiedErrorId?: string | null;
  onToggleBlock: (id: string) => void;
  onCopyBlockWithError?: (block: DiffBlock, errors: string[]) => void;
}

export function DeleteBlockCard({
  block,
  validationErrors,
  isIgnored,
  copiedErrorId,
  onToggleBlock,
  onCopyBlockWithError,
}: DeleteBlockCardProps) {
  const combinedErrors = Array.from(
    new Set([...(block.errors || []), ...validationErrors]),
  );

  return (
    <div
      className={`bg-rose-950/20 border border-rose-900/40 rounded-xl flex flex-col transition-all ${
        isIgnored ? "opacity-50 grayscale" : ""
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3 min-w-0">
          <span className="bg-rose-500/20 text-rose-400 text-[10px] px-1.5 py-0.5 rounded border border-rose-500/20 font-bold uppercase shrink-0">
            Delete File
          </span>
          <span className="text-xs text-rose-300/80 font-medium shrink-0">
            File will be permanently removed:
          </span>
          <span className="text-xs font-mono text-zinc-100 font-semibold truncate">
            {block.file}
          </span>
          <StatusBadge
            status={block.status}
            matchLabel="File Found"
            noMatchLabel="File Missing"
          />
        </div>
        <AcceptToggle
          isIgnored={isIgnored}
          onToggle={() => onToggleBlock(block.id)}
        />
      </div>
      {!isIgnored && combinedErrors.length > 0 && (
        <ValidationErrorBanner
          block={block}
          validationErrors={combinedErrors}
          copiedErrorId={copiedErrorId}
          onCopyBlockWithError={onCopyBlockWithError}
          borderClass="border-t border-rose-900/50"
        />
      )}
    </div>
  );
}