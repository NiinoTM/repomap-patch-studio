import { useState, useMemo } from "react";
import { FileText, Search, X, Trash2, CheckSquare } from "lucide-react";

interface SelectedFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFiles: Set<string>;
  onToggleFile: (filePath: string) => void;
  onDeselectAll: () => void;
}

export function SelectedFilesModal({
  isOpen,
  onClose,
  selectedFiles,
  onToggleFile,
  onDeselectAll,
}: SelectedFilesModalProps) {
  const [filterQuery, setFilterQuery] = useState("");

  const selectedList = useMemo(() => {
    const list = Array.from(selectedFiles).sort();
    if (!filterQuery.trim()) return list;
    const query = filterQuery.toLowerCase();
    return list.filter((file) => file.toLowerCase().includes(query));
  }, [selectedFiles, filterQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-xl flex flex-col overflow-hidden shadow-2xl max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-zinc-200">
              Selected Files ({selectedFiles.size})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search in selected files..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-8 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery("")}
                className="absolute right-2.5 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-1">
          {selectedList.length > 0 ? (
            selectedList.map((filePath) => (
              <div
                key={filePath}
                className="flex items-center justify-between py-1.5 px-2.5 rounded-md bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/50 text-xs group transition-colors"
              >
                <div className="flex items-center space-x-2 min-w-0 pr-2">
                  <FileText className="w-3.5 h-3.5 text-cyan-500/80 shrink-0" />
                  <span
                    className="text-zinc-200 font-mono text-[11px] truncate"
                    title={filePath}
                  >
                    {filePath}
                  </span>
                </div>
                <button
                  onClick={() => onToggleFile(filePath)}
                  className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-zinc-800 transition-colors shrink-0 cursor-pointer"
                  title="Remove from selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-xs text-zinc-500">
              {selectedFiles.size === 0
                ? "No files currently selected."
                : "No selected files match your search."}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between">
          {selectedFiles.size > 0 ? (
            <button
              onClick={onDeselectAll}
              className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-colors flex items-center space-x-1.5 border border-red-900/30 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Deselect All</span>
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
