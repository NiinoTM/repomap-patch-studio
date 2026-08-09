import { AlertTriangle, X } from "lucide-react";
import { MissingDependency } from "../../utils/completenessCheck";

interface CompletenessWarningModalProps {
  missingDependencies: MissingDependency[];
  onAddMissingAndCopy: () => void;
  onCopyAnyway: () => void;
  onCancel: () => void;
}

export function CompletenessWarningModal({
  missingDependencies,
  onAddMissingAndCopy,
  onCopyAnyway,
  onCancel,
}: CompletenessWarningModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-amber-500/40 rounded-xl w-full max-w-lg flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
          <h2 className="text-sm font-bold text-amber-400 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2 shrink-0" />
            Context Incomplete ({missingDependencies.length})
          </h2>
          <button
            onClick={onCancel}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[50vh] custom-scrollbar space-y-2">
          <p className="text-xs text-zinc-400">
            These files are referenced by your current selection but are not
            included. Sending code without them risks the AI hallucinating their
            contents.
          </p>
          {missingDependencies.map((dep) => (
            <div
              key={dep.filePath}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-2.5"
            >
              <p className="font-mono text-xs text-zinc-200 truncate">
                {dep.filePath}
              </p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                {dep.kind === "api" ? "Called by " : "Imported by "}
                {dep.requiredBy.map((f) => f.split("/").pop() || f).join(", ")}
              </p>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-end space-x-3">
          <button
            onClick={onCopyAnyway}
            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700 cursor-pointer"
          >
            Copy Anyway
          </button>
          <button
            onClick={onAddMissingAndCopy}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors shadow-lg shadow-amber-900/20 cursor-pointer"
          >
            Add Missing & Copy
          </button>
        </div>
      </div>
    </div>
  );
}
