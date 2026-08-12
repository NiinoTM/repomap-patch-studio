import { AlertTriangle, CheckCircle2, Copy } from "lucide-react";
import { DiffBlock } from "../../../../types/patch";

interface ValidationErrorBannerProps {
  block: DiffBlock;
  validationErrors: string[];
  copiedErrorId?: string | null;
  onCopyBlockWithError?: (block: DiffBlock, errors: string[]) => void;
  borderClass?: string;
}

export function ValidationErrorBanner({
  block,
  validationErrors,
  copiedErrorId,
  onCopyBlockWithError,
  borderClass = "border-b border-rose-900/50",
}: ValidationErrorBannerProps) {
  if (validationErrors.length === 0) return null;

  return (
    <div
      className={`bg-rose-950/40 ${borderClass} px-4 py-2 flex items-center justify-between`}
    >
      <div className="flex flex-col space-y-1.5 min-w-0 pr-2">
        {validationErrors.map((err, i) => (
          <div
            key={i}
            className="flex items-start text-[11px] text-rose-400/90 leading-tight"
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <span className="font-mono">{err}</span>
          </div>
        ))}
      </div>
      {onCopyBlockWithError && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopyBlockWithError(block, validationErrors);
          }}
          className="px-2 py-1 bg-rose-900/50 hover:bg-rose-800/60 text-rose-200 text-[10px] rounded font-medium transition-colors shrink-0 flex items-center space-x-1 border border-rose-700/40 cursor-pointer"
          title="Copy block with error for AI resolution"
        >
          {copiedErrorId === block.id ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy with Error</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
