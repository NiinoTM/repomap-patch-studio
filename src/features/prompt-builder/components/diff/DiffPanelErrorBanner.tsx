import { AlertTriangle, CheckCircle2, Copy } from "lucide-react";

interface DiffPanelErrorBannerProps {
  validationErrors: string[];
  copiedAllErrors: boolean;
  onCopyAllErrors: () => void;
}

export function DiffPanelErrorBanner({
  validationErrors,
  copiedAllErrors,
  onCopyAllErrors,
}: DiffPanelErrorBannerProps) {
  if (validationErrors.length === 0) return null;

  return (
    <div className="bg-rose-950/40 border border-rose-900/60 rounded-xl p-3 flex items-center justify-between shrink-0 shadow-sm">
      <div className="flex items-center space-x-2.5 text-rose-300 text-xs font-medium min-w-0 pr-2">
        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
        <span className="truncate">
          {validationErrors.length} validation{" "}
          {validationErrors.length === 1 ? "error" : "errors"} detected in diff
          blocks
        </span>
      </div>
      <button
        onClick={onCopyAllErrors}
        className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800/80 text-rose-100 text-xs font-medium rounded-lg transition-colors shrink-0 flex items-center space-x-1.5 cursor-pointer border border-rose-700/50"
        title="Copy all validation errors to clipboard for AI resolution"
      >
        {copiedAllErrors ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Copied All Errors!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 text-rose-300" />
            <span>Copy All Errors</span>
          </>
        )}
      </button>
    </div>
  );
}
