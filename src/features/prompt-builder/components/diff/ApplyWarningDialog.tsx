import { useEffect, useRef } from "react";
import { AlertTriangle, Check, X } from "lucide-react";

export interface ApplyWarningDialogProps {
  isOpen: boolean;
  warnings: string[];
  isCommitting?: boolean;
  isApplying?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ApplyWarningDialog({
  isOpen,
  warnings,
  isCommitting = false,
  isApplying = false,
  onConfirm,
  onCancel,
}: ApplyWarningDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="bg-zinc-900 border border-amber-500/40 rounded-lg p-0 backdrop:bg-black/70 m-auto max-w-lg w-full shadow-2xl shadow-amber-950/40"
      onCancel={onCancel}
    >
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                Non-Breaking Warnings Detected
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                The following ESLint or non-breaking issues were found. They will not break execution.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-zinc-500 hover:text-zinc-300 p-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-56 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-md p-3 space-y-2 custom-scrollbar">
          {warnings.map((warn, i) => (
            <div
              key={i}
              className="flex items-start space-x-2 text-[11px] font-mono text-amber-300/90 leading-relaxed"
            >
              <span className="text-amber-500 font-bold shrink-0">•</span>
              <span className="break-all">{warn}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-zinc-400">
          Would you like to proceed with applying these changes to disk?
        </p>

        <div className="flex justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isApplying}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isApplying}
            className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center space-x-2 shadow-lg shadow-amber-600/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>
              {isApplying
                ? "Applying..."
                : isCommitting
                  ? "Proceed & Continue Commit"
                  : "Proceed & Apply Changes"}
            </span>
          </button>
        </div>
      </div>
    </dialog>
  );
}