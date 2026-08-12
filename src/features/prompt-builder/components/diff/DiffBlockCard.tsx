import { DiffBlock } from "../../../../types/patch";
import { MoveBlockCard } from "./MoveBlockCard";
import { DiffBlockHeader } from "./DiffBlockHeader";
import { ValidationErrorBanner } from "./ValidationErrorBanner";
import { DiffBlockBody } from "./DiffBlockBody";

interface DiffBlockCardProps {
  block: DiffBlock;
  validationErrors?: string[];
  isIgnored?: boolean;
  isCollapsed?: boolean;
  isEditing?: boolean;
  editSearch?: string;
  editReplace?: string;
  copiedId?: string | null;
  copiedErrorId?: string | null;
  onToggleBlock: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onCopyBlock: (block: DiffBlock) => void;
  onCopyBlockWithError?: (block: DiffBlock, errors: string[]) => void;
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
  copiedErrorId,
  onToggleBlock,
  onToggleCollapse,
  onCopyBlock,
  onCopyBlockWithError,
  onStartEditing,
  onSaveEdit,
  onEditSearchChange,
  onEditReplaceChange,
}: DiffBlockCardProps) {
  if (block.type === "move") {
    return (
      <MoveBlockCard
        block={block}
        validationErrors={validationErrors}
        isIgnored={isIgnored}
        copiedErrorId={copiedErrorId}
        onToggleBlock={onToggleBlock}
        onCopyBlockWithError={onCopyBlockWithError}
      />
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
      <DiffBlockHeader
        block={block}
        isCollapsed={isCollapsed}
        isEditing={isEditing}
        copiedId={copiedId}
        copiedErrorId={copiedErrorId}
        validationErrors={validationErrors}
        isIgnored={isIgnored}
        searchLinesCount={searchLines.length}
        replaceLinesCount={replaceLines.length}
        onToggleCollapse={onToggleCollapse}
        onCopyBlock={onCopyBlock}
        onCopyBlockWithError={onCopyBlockWithError}
        onStartEditing={onStartEditing}
        onSaveEdit={onSaveEdit}
        onToggleBlock={onToggleBlock}
      />

      {!isIgnored && (
        <ValidationErrorBanner
          block={block}
          validationErrors={validationErrors}
          copiedErrorId={copiedErrorId}
          onCopyBlockWithError={onCopyBlockWithError}
          borderClass="border-b border-rose-900/50"
        />
      )}

      <DiffBlockBody
        block={block}
        isCollapsed={isCollapsed}
        isEditing={isEditing}
        editSearch={editSearch}
        editReplace={editReplace}
        searchLines={searchLines}
        replaceLines={replaceLines}
        onToggleCollapse={onToggleCollapse}
        onEditSearchChange={onEditSearchChange}
        onEditReplaceChange={onEditReplaceChange}
      />
    </div>
  );
}
