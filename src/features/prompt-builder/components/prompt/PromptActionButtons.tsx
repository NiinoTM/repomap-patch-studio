import { Copy, FileText } from "lucide-react";

interface PromptActionButtonsProps {
  discoveryMode: boolean;
  selectedFilesCount: number;
  isCopying: boolean;
  isCopyingFiles: boolean;
  onCopyFull: () => void;
  onCopyFiles: () => void;
}

export function PromptActionButtons({
  discoveryMode,
  selectedFilesCount,
  isCopying,
  isCopyingFiles,
  onCopyFull,
  onCopyFiles,
}: PromptActionButtonsProps) {
  return (
    <div className="flex space-x-2 shrink-0">
      <button
        onClick={onCopyFull}
        disabled={isCopying || isCopyingFiles}
        className={`flex-1 font-semibold py-2.5 rounded-lg shadow-lg flex items-center justify-center space-x-1.5 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer text-[11px] ${
          discoveryMode
            ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/10"
            : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/10"
        }`}
      >
        <Copy className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">
          {isCopying
            ? "Assembling..."
            : discoveryMode
              ? "Ask AI What's Needed"
              : `Full Context (${selectedFilesCount})`}
        </span>
      </button>

      <button
        onClick={onCopyFiles}
        disabled={
          isCopying ||
          isCopyingFiles ||
          selectedFilesCount === 0 ||
          discoveryMode
        }
        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2.5 rounded-lg flex items-center justify-center space-x-1.5 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer border border-zinc-700 text-[11px]"
      >
        <FileText className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">
          {isCopyingFiles
            ? "Fetching..."
            : `Files + Prompt (${selectedFilesCount})`}
        </span>
      </button>
    </div>
  );
}
