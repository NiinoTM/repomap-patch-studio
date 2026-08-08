import React, { useState, useMemo } from "react";
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  CheckSquare,
  Square,
  MinusSquare,
  Search,
  X,
} from "lucide-react";
import { buildFileTree, TreeNode } from "../../utils/treeBuilder";

interface FileTreeProps {
  files: string[];
  selectedFiles: Set<string>;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onToggleFile: (filePath: string) => void;
  onToggleFolder: (folderFiles: string[], shouldSelect: boolean) => void;
}

export function FileTree({
  files,
  selectedFiles,
  searchQuery,
  onSearchQueryChange,
  onSelectAll,
  onDeselectAll,
  onToggleFile,
  onToggleFolder,
}: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["root"]),
  );

  const treeData = useMemo(() => buildFileTree(files, searchQuery), [files, searchQuery]);

  const toggleFolderExpand = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      return next;
    });
  };

  const toggleFolderSelection = (node: TreeNode) => {
    const folderFiles = node.allFiles;
    const allSelected = folderFiles.every((f) => selectedFiles.has(f));
    onToggleFolder(folderFiles, !allSelected);
  };

  const renderTreeNode = (node: TreeNode, depth = 0): React.ReactNode => {
    if (node.isFolder) {
      const isExpanded =
        expandedFolders.has(node.path) || searchQuery.trim().length > 0;
      const folderFiles = node.allFiles;
      const selectedCount = folderFiles.filter((f) =>
        selectedFiles.has(f),
      ).length;
      const allSelected =
        folderFiles.length > 0 && selectedCount === folderFiles.length;
      const someSelected =
        selectedCount > 0 && selectedCount < folderFiles.length;

      return (
        <div key={node.path || node.name} className="select-none">
          <div
            className="flex items-center py-1 px-1 rounded hover:bg-zinc-800/60 cursor-pointer text-xs text-zinc-300"
            style={{ paddingLeft: `${depth * 12 + 4}px` }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderSelection(node);
              }}
              className="mr-1.5 text-zinc-400 hover:text-cyan-400 transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-cyan-500 fill-cyan-500/20" />
              ) : someSelected ? (
                <MinusSquare className="w-3.5 h-3.5 text-cyan-500" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>

            <div
              onClick={() => toggleFolderExpand(node.path)}
              className="flex items-center flex-1 min-w-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500 mr-1 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500 mr-1 shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-cyan-500/80 mr-1.5 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-zinc-400 mr-1.5 shrink-0" />
              )}
              <span className="font-medium text-zinc-200 truncate">
                {node.name}
              </span>
              <span className="ml-auto text-[10px] text-zinc-600 pl-2">
                {selectedCount}/{folderFiles.length}
              </span>
            </div>
          </div>

          {isExpanded && (
            <div>
              {node.children.map((child) => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const isSelected = selectedFiles.has(node.path);
    return (
      <div
        key={node.path}
        onClick={() => onToggleFile(node.path)}
        className={`flex items-center py-1 px-1 rounded text-xs cursor-pointer select-none transition-colors ${
          isSelected
            ? "bg-zinc-800/70 text-zinc-100"
            : "text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200"
        }`}
        style={{ paddingLeft: `${depth * 12 + 20}px` }}
      >
        <button className="mr-1.5 text-zinc-400 hover:text-cyan-400">
          {isSelected ? (
            <CheckSquare className="w-3.5 h-3.5 text-cyan-500 fill-cyan-500/20" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
        </button>
        <FileText className="w-3.5 h-3.5 text-zinc-500 mr-1.5 shrink-0" />
        <span className="truncate">{node.name}</span>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col space-y-2 min-h-0">
      <div className="flex items-center justify-between">
        <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
          Context Selection ({selectedFiles.size}/{files.length})
        </label>
        <div className="flex items-center space-x-2 text-[10px]">
          <button
            onClick={onSelectAll}
            className="text-cyan-500 hover:text-cyan-400 font-medium hover:underline cursor-pointer"
          >
            Select All
          </button>
          <span className="text-zinc-700">|</span>
          <button
            onClick={onDeselectAll}
            className="text-zinc-500 hover:text-zinc-400 font-medium hover:underline cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 absolute left-2.5 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Filter files or folders..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="w-full bg-zinc-900/80 border border-zinc-800 rounded-md pl-8 pr-3 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchQueryChange("")}
            className="absolute right-2 text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-md overflow-hidden flex flex-col">
        <div className="p-2 space-y-0.5 overflow-y-auto custom-scrollbar flex-1">
          {treeData.children.length > 0 ? (
            treeData.children.map((child) => renderTreeNode(child))
          ) : (
            <div className="text-center py-6 text-xs text-zinc-600">
              No files found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}