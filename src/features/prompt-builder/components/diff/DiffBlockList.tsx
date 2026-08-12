import { DiffBlock } from "../../../../types/patch";
import { DiffBlockCard } from "./DiffBlockCard";
import { FilterMode } from "./DiffFilterToolbar";

interface DiffBlockListProps {
  filteredBlocks: DiffBlock[];
  filterMode: FilterMode;
  effectiveIgnoredBlocks: Set<string>;
  collapsedBlocks: Set<string>;
  editingBlockId: string | null;
  editSearch: string;
  editReplace: string;
  copiedId: string | null;
  copiedErrorBlockId: string | null;
  getBlockErrors: (block: DiffBlock) => string[];
  onSelectFilter: (mode: FilterMode) => void;
  onToggleBlock: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onCopyBlock: (block: DiffBlock) => void;
  onCopyBlockWithError: (block: DiffBlock, errors: string[]) => void;
  onStartEditing: (block: DiffBlock) => void;
  onSaveEdit: () => void;
  onEditSearchChange: (val: string) => void;
  onEditReplaceChange: (val: string) => void;
}

export function DiffBlockList({
  filteredBlocks,
  filterMode,
  effectiveIgnoredBlocks,
  collapsedBlocks,
  editingBlockId,
  editSearch,
  editReplace,
  copiedId,
  copiedErrorBlockId,
  getBlockErrors,
  onSelectFilter,
  onToggleBlock,
  onToggleCollapse,
  onCopyBlock,
  onCopyBlockWithError,
  onStartEditing,
  onSaveEdit,
  onEditSearchChange,
  onEditReplaceChange,
}: DiffBlockListProps) {
  if (filteredBlocks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2 border border-zinc-800/60 rounded-xl bg-zinc-900/20">
        <p className="text-xs font-semibold text-zinc-400">
          No diff blocks match current filter (
          <span className="text-cyan-400 font-bold uppercase">
            {filterMode}
          </span>
          )
        </p>
        <button
          onClick={() => onSelectFilter("all")}
          className="text-xs text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
        >
          Show all blocks
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
      {filteredBlocks.map((block) => (
        <DiffBlockCard
          key={block.id}
          block={block}
          validationErrors={getBlockErrors(block)}
          isIgnored={Boolean(effectiveIgnoredBlocks?.has?.(block.id))}
          isCollapsed={Boolean(collapsedBlocks?.has?.(block.id))}
          isEditing={editingBlockId === block.id}
          editSearch={editSearch}
          editReplace={editReplace}
          copiedId={copiedId}
          copiedErrorId={copiedErrorBlockId}
          onToggleBlock={onToggleBlock}
          onToggleCollapse={onToggleCollapse}
          onCopyBlock={onCopyBlock}
          onCopyBlockWithError={onCopyBlockWithError}
          onStartEditing={onStartEditing}
          onSaveEdit={onSaveEdit}
          onEditSearchChange={onEditSearchChange}
          onEditReplaceChange={onEditReplaceChange}
        />
      ))}
    </div>
  );
}
