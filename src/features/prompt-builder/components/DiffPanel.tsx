import { useState, useEffect } from "react";
import { ClipboardPaste } from "lucide-react";
import { DiffBlock, DiffViewMode } from "../../../types/patch";
import { DiffFilterToolbar, type FilterMode } from "./diff/DiffFilterToolbar";
import { DiffPanelErrorBanner } from "./diff/DiffPanelErrorBanner";
import { EmptyDiffState } from "./diff/EmptyDiffState";
import { DiffBlockList } from "./diff/DiffBlockList";
import { useApplyChanges } from "../hooks/useApplyChanges";

interface DiffPanelProps {
  parsedBlocks: DiffBlock[];
  onPaste: (append?: boolean) => void;
  onClear: () => void;
  pastedContent: string;
  onBlockEdit?: (id: string, search: string, replace: string) => void;
  ignoredBlocks?: Set<string>;
  onToggleBlock?: (id: string) => void;
}

export function DiffPanel({
  parsedBlocks = [],
  onPaste,
  onClear,
  pastedContent = "",
  onBlockEdit,
  ignoredBlocks,
  onToggleBlock,
}: DiffPanelProps) {
  const [internalIgnoredBlocks, setInternalIgnoredBlocks] = useState<
    Set<string>
  >(new Set());
  const effectiveIgnoredBlocks =
    ignoredBlocks ?? internalIgnoredBlocks ?? new Set<string>();

  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [viewMode, setViewMode] = useState<DiffViewMode>("unified");
  const [showDebug, setShowDebug] = useState(false);
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(
    new Set(),
  );

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editSearch, setEditSearch] = useState("");
  const [editReplace, setEditReplace] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAllErrors, setCopiedAllErrors] = useState(false);
  const [copiedErrorBlockId, setCopiedErrorBlockId] = useState<string | null>(
    null,
  );

  const handleCopyBlock = (block: DiffBlock) => {
    const targetFile = block.matchedFile || block.file;
    const text = `FILE: ${targetFile}\n<<<<<<< SEARCH\n${block.search}\n=======\n${block.replace}\n>>>>>>> REPLACE`;
    navigator.clipboard.writeText(text);
    setCopiedId(block.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllErrors = () => {
    if (validationErrors.length === 0) return;
    const text = [
      "### Patch Validation Errors for AI Resolution\n",
      "The following validation errors were encountered when checking diff blocks:\n",
      ...validationErrors.map((err, idx) => `${idx + 1}. ${err}`),
      "\nPlease analyze these errors and provide updated diff blocks that fix these issues.",
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopiedAllErrors(true);
    setTimeout(() => setCopiedAllErrors(false), 2000);
  };

  const handleCopyBlockWithError = (block: DiffBlock, errors: string[]) => {
    const targetFile = block.matchedFile || block.file;
    const blockContent =
      block.type === "move"
        ? `MOVE '${block.file}' -> '${block.moveTo}'`
        : `FILE: ${targetFile}\n<<<<<<< SEARCH\n${block.search}\n=======\n${block.replace}\n>>>>>>> REPLACE`;

    const formattedErrors =
      errors.length > 0
        ? errors.map((err) => `- ${err}`).join("\n")
        : "- No specific validation error provided.";

    const text = `### Error Report for Block: ${targetFile}\n\nValidation Errors:\n${formattedErrors}\n\nBlock Content:\n${blockContent}\n\nPlease fix this patch block so that SEARCH matches the current file content.`;

    navigator.clipboard.writeText(text);
    setCopiedErrorBlockId(block.id);
    setTimeout(() => setCopiedErrorBlockId(null), 2000);
  };

  const startEditing = (block: DiffBlock) => {
    setEditingBlockId(block.id);
    setEditSearch(block.search || "");
    setEditReplace(block.replace || "");
    if (collapsedBlocks.has(block.id)) toggleCollapse(block.id);
  };

  const saveEdit = () => {
    if (editingBlockId && onBlockEdit)
      onBlockEdit(editingBlockId, editSearch, editReplace);
    setEditingBlockId(null);
  };

  useEffect(() => {
    if (parsedBlocks.length === 0) setFilterMode("all");
  }, [parsedBlocks]);

  useEffect(() => {
    if (parsedBlocks.length > 1) {
      setCollapsedBlocks(new Set(parsedBlocks.map((b) => b.id)));
    } else if (parsedBlocks.length === 1) {
      const totalLines = (
        (parsedBlocks[0].search || "") + (parsedBlocks[0].replace || "")
      ).split("\n").length;
      setCollapsedBlocks(
        totalLines > 25 ? new Set([parsedBlocks[0].id]) : new Set(),
      );
    } else {
      setCollapsedBlocks(new Set());
    }
  }, [parsedBlocks]);

  const toggleBlock = (id: string) => {
    if (onToggleBlock) {
      onToggleBlock(id);
    } else {
      setInternalIgnoredBlocks((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  };

  const toggleCollapse = (id: string) => {
    setCollapsedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllCollapse = () => {
    setCollapsedBlocks(
      collapsedBlocks.size === parsedBlocks.length
        ? new Set()
        : new Set(parsedBlocks.map((b) => b.id)),
    );
  };

  const activeBlocks = parsedBlocks.filter(
    (b) => !effectiveIgnoredBlocks?.has?.(b.id),
  );

  const { validationErrors = [], isValidating } = useApplyChanges({
    diffBlocks: activeBlocks,
    autoValidate: true,
  });

  const getBlockErrors = (block: DiffBlock) =>
    validationErrors.filter(
      (err) =>
        err.includes(block.file) ||
        (block.matchedFile && err.includes(block.matchedFile)) ||
        (block.moveTo && err.includes(block.moveTo)),
    );

  const matchCount = activeBlocks.filter((b) => b.status === "match").length;
  const noMatchCount = activeBlocks.filter(
    (b) => b.status === "no-match",
  ).length;
  const ignoredCount = parsedBlocks.filter((b) =>
    effectiveIgnoredBlocks?.has?.(b.id),
  ).length;
  const allCollapsed =
    parsedBlocks.length > 0 && collapsedBlocks.size === parsedBlocks.length;

  const filteredBlocks = parsedBlocks.filter((block) => {
    const isIgnored = Boolean(effectiveIgnoredBlocks?.has?.(block.id));
    const hasError = getBlockErrors(block).length > 0;
    switch (filterMode) {
      case "active":
        return !isIgnored;
      case "matched":
        return !isIgnored && block.status === "match";
      case "not-matched":
        return !isIgnored && block.status === "no-match";
      case "errors":
        return !isIgnored && hasError;
      case "ignored":
        return isIgnored;
      case "all":
      default:
        return true;
    }
  });

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-zinc-950 p-4 space-y-4 overflow-hidden">
      <DiffFilterToolbar
        parsedBlocksCount={parsedBlocks.length}
        activeCount={activeBlocks.length}
        matchCount={matchCount}
        noMatchCount={noMatchCount}
        ignoredCount={ignoredCount}
        validationErrorCount={validationErrors.length}
        isValidating={isValidating}
        filterMode={filterMode}
        onSelectFilter={setFilterMode}
        viewMode={viewMode}
        onSelectViewMode={setViewMode}
        allCollapsed={allCollapsed}
        onToggleAllCollapse={toggleAllCollapse}
        pastedContent={pastedContent}
        onClear={onClear}
      />

      <DiffPanelErrorBanner
        validationErrors={validationErrors}
        copiedAllErrors={copiedAllErrors}
        onCopyAllErrors={handleCopyAllErrors}
      />

      <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
        {!pastedContent ? (
          <div
            onClick={() => onPaste()}
            className="flex-1 border-2 border-dashed border-zinc-800 rounded-xl flex items-center justify-center cursor-pointer hover:bg-zinc-900/30 transition-colors group"
          >
            <div className="flex flex-col items-center text-zinc-600 group-hover:text-zinc-500 transition-colors">
              <ClipboardPaste className="w-8 h-8 mb-2" />
              <span className="text-xs uppercase font-bold tracking-widest">
                Click to paste response
              </span>
            </div>
          </div>
        ) : parsedBlocks.length === 0 ? (
          <EmptyDiffState
            onClear={onClear}
            pastedContent={pastedContent}
            showDebug={showDebug}
            onToggleDebug={() => setShowDebug(!showDebug)}
          />
        ) : (
          <>
            <DiffBlockList
              filteredBlocks={filteredBlocks}
              filterMode={filterMode}
              viewMode={viewMode}
              effectiveIgnoredBlocks={effectiveIgnoredBlocks}
              collapsedBlocks={collapsedBlocks}
              editingBlockId={editingBlockId}
              editSearch={editSearch}
              editReplace={editReplace}
              copiedId={copiedId}
              copiedErrorBlockId={copiedErrorBlockId}
              getBlockErrors={getBlockErrors}
              onSelectFilter={setFilterMode}
              onToggleBlock={toggleBlock}
              onToggleCollapse={toggleCollapse}
              onCopyBlock={handleCopyBlock}
              onCopyBlockWithError={handleCopyBlockWithError}
              onStartEditing={startEditing}
              onSaveEdit={saveEdit}
              onEditSearchChange={setEditSearch}
              onEditReplaceChange={setEditReplace}
            />

            <div
              onClick={() => onPaste(true)}
              className="h-20 shrink-0 border-2 border-dashed border-zinc-800 rounded-xl flex items-center justify-center cursor-pointer hover:bg-zinc-900/30 transition-colors"
            >
              <div className="flex flex-col items-center text-zinc-600">
                <ClipboardPaste className="w-5 h-5 mb-1" />
                <span className="text-[10px] uppercase font-bold tracking-widest">
                  Paste additional block
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
