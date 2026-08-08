import { useState, useEffect } from "react";
import {
  ClipboardPaste,
  AlertTriangle,
  Bug,
  CheckCircle2,
  XCircle,
  FoldVertical,
  UnfoldVertical,
} from "lucide-react";
import { DiffBlock } from "../../../types/patch";
import { ClipboardDebugger } from "./diff/ClipboardDebugger";
import { DiffBlockCard } from "./diff/DiffBlockCard";

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

  const [showDebug, setShowDebug] = useState(false);
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(
    new Set(),
  );

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editSearch, setEditSearch] = useState("");
  const [editReplace, setEditReplace] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyBlock = (block: DiffBlock) => {
    const text = `FILE: ${block.file}\n<<<<<<< SEARCH\n${block.search}\n=======\n${block.replace}\n>>>>>>> REPLACE`;
    navigator.clipboard.writeText(text);
    setCopiedId(block.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEditing = (block: DiffBlock) => {
    setEditingBlockId(block.id);
    setEditSearch(block.search || "");
    setEditReplace(block.replace || "");
    if (collapsedBlocks.has(block.id)) {
      toggleCollapse(block.id);
    }
  };

  const saveEdit = () => {
    if (editingBlockId && onBlockEdit) {
      onBlockEdit(editingBlockId, editSearch, editReplace);
    }
    setEditingBlockId(null);
  };

  useEffect(() => {
    if (parsedBlocks.length > 1) {
      setCollapsedBlocks(new Set(parsedBlocks.map((b) => b.id)));
    } else if (parsedBlocks.length === 1) {
      const totalLines = (
        (parsedBlocks[0].search || "") + (parsedBlocks[0].replace || "")
      ).split("\n").length;
      if (totalLines > 25) {
        setCollapsedBlocks(new Set([parsedBlocks[0].id]));
      } else {
        setCollapsedBlocks(new Set());
      }
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
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    }
  };

  const toggleCollapse = (id: string) => {
    setCollapsedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllCollapse = () => {
    if (collapsedBlocks.size === parsedBlocks.length) {
      setCollapsedBlocks(new Set());
    } else {
      setCollapsedBlocks(new Set(parsedBlocks.map((b) => b.id)));
    }
  };

  const activeBlocks = parsedBlocks.filter(
    (b) => !effectiveIgnoredBlocks?.has?.(b.id),
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

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-zinc-950 p-4 space-y-4 overflow-hidden">
      <div className="flex items-center justify-between bg-zinc-900 p-2 rounded-lg border border-zinc-800 flex-wrap gap-2">
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          {parsedBlocks.length > 0 && (
            <>
              <div className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                {parsedBlocks.length} DETECTED
              </div>
              <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>{matchCount} MATCHED</span>
              </div>
              <div
                className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 border ${
                  noMatchCount > 0
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : "bg-zinc-800/80 text-zinc-500 border-zinc-700/50"
                }`}
              >
                <XCircle
                  className={`w-3 h-3 ${
                    noMatchCount > 0 ? "text-rose-400" : "text-zinc-500"
                  }`}
                />
                <span>{noMatchCount} NOT FOUND</span>
              </div>
              {ignoredCount > 0 && (
                <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                  {ignoredCount} IGNORED
                </div>
              )}
            </>
          )}
          <span className="text-xs text-zinc-400">
            Paste AI response below to review diffs
          </span>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {parsedBlocks.length > 0 && (
            <button
              onClick={toggleAllCollapse}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center space-x-1 border border-zinc-700/50"
              title={
                allCollapsed
                  ? "Expand all diff blocks"
                  : "Retract all diff blocks"
              }
            >
              {allCollapsed ? (
                <>
                  <UnfoldVertical className="w-3.5 h-3.5" />
                  <span>Expand All</span>
                </>
              ) : (
                <>
                  <FoldVertical className="w-3.5 h-3.5" />
                  <span>Retract All</span>
                </>
              )}
            </button>
          )}
          {pastedContent && (
            <button
              onClick={onClear}
              className="text-xs bg-zinc-800 px-3 py-1 rounded text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer border border-zinc-700/50"
            >
              Clear
            </button>
          )}
        </div>
      </div>

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
          <div className="flex-1 border border-amber-500/30 bg-amber-950/20 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3 overflow-y-auto custom-scrollbar">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
            <p className="text-sm font-semibold text-zinc-200">
              No Diff Blocks Detected
            </p>
            <p className="text-xs text-zinc-400 max-w-md">
              The pasted clipboard text does not contain valid
              <code className="text-cyan-400">
                &lt;&lt;&lt;&lt;&lt;&lt;&lt; SEARCH
              </code>
              , <code className="text-cyan-400">Create 'file'</code>, or
              <code className="text-cyan-400">MOVE 'old' -&gt; 'new'</code>
              blocks.
            </p>
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={onClear}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg transition-colors cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700/80 text-cyan-400 text-xs rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
              >
                <Bug className="w-3.5 h-3.5 mr-1" />
                <span>
                  {showDebug ? "Hide Clipboard Text" : "Debug Clipboard Text"}
                </span>
              </button>
            </div>

            {showDebug && <ClipboardDebugger pastedContent={pastedContent} />}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
              {parsedBlocks.map((block) => (
                <DiffBlockCard
                  key={block.id}
                  block={block}
                  isIgnored={Boolean(effectiveIgnoredBlocks?.has?.(block.id))}
                  isCollapsed={Boolean(collapsedBlocks?.has?.(block.id))}
                  isEditing={editingBlockId === block.id}
                  editSearch={editSearch}
                  editReplace={editReplace}
                  copiedId={copiedId}
                  onToggleBlock={toggleBlock}
                  onToggleCollapse={toggleCollapse}
                  onCopyBlock={handleCopyBlock}
                  onStartEditing={startEditing}
                  onSaveEdit={saveEdit}
                  onEditSearchChange={setEditSearch}
                  onEditReplaceChange={setEditReplace}
                />
              ))}
            </div>

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