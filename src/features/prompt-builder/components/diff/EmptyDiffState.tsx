import { AlertTriangle, Bug } from "lucide-react";
import { ClipboardDebugger } from "./ClipboardDebugger";

interface EmptyDiffStateProps {
  onClear: () => void;
  pastedContent: string;
  showDebug: boolean;
  onToggleDebug: () => void;
}

export function EmptyDiffState({
  onClear,
  pastedContent,
  showDebug,
  onToggleDebug,
}: EmptyDiffStateProps) {
  return (
    <div className="flex-1 border border-amber-500/30 bg-amber-950/20 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3 overflow-y-auto custom-scrollbar">
      <AlertTriangle className="w-8 h-8 text-amber-400" />
      <p className="text-sm font-semibold text-zinc-200">
        No Diff Blocks Detected
      </p>
      <p className="text-xs text-zinc-400 max-w-md">
        The pasted clipboard text does not contain valid{" "}
        <code className="text-cyan-400">
          &lt;&lt;&lt;&lt;&lt;&lt;&lt; SEARCH
        </code>
        , <code className="text-cyan-400">Create 'file'</code>, or{" "}
        <code className="text-cyan-400">MOVE 'old' -&gt; 'new'</code> blocks.
      </p>
      <div className="flex items-center space-x-3 pt-2">
        <button
          onClick={onClear}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg transition-colors cursor-pointer"
        >
          Clear
        </button>
        <button
          onClick={onToggleDebug}
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
  );
}
