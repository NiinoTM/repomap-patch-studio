import { AlertTriangle, CheckCircle2, Copy, Sparkles } from "lucide-react";

interface DiffPanelErrorBannerProps {
  validationErrors: string[];
  copiedAllErrors: boolean;
  onCopyAllErrors: () => void;
  onAutoHeal?: () => void;
  copiedAutoHeal?: boolean;
}

export function DiffPanelErrorBanner({
  validationErrors,
  copiedAllErrors,
  onCopyAllErrors,
  onAutoHeal,
  copiedAutoHeal,
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
      <div className="flex items-center space-x-2 shrink-0">
        {onAutoHeal && (
          <button
            onClick={onAutoHeal}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-amber-900/20 flex items-center space-x-1.5 cursor-pointer"
            title="Copy automated Auto-Heal prompt with diagnostics for AI resolution"
          >
            {copiedAutoHeal ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                <span>Copied Auto-Heal!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Auto-Heal Prompt</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={onCopyAllErrors}
          className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800/80 text-rose-100 text-xs font-medium rounded-lg transition-colors shrink-0 flex items-center space-x-1.5 cursor-pointer border border-rose-700/50"
          title="Copy raw error messages to clipboard"
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
    </div>
  );
}
