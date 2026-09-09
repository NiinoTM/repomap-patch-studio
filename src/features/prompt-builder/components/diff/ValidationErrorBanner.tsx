import { AlertTriangle, CheckCircle2, Copy } from "lucide-react";
import { DiffBlock } from "../../../../types/patch";

interface ValidationErrorBannerProps {
  block: DiffBlock;
  validationErrors: string[];
  copiedErrorId?: string | null;
  onCopyBlockWithError?: (block: DiffBlock, errors: string[]) => void;
  borderClass?: string;
}

function isWarningMessage(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.startsWith("eslint warning") || lower.includes("warning") || lower.includes("[warn]");
}

export function ValidationErrorBanner({
  block,
  validationErrors,
  copiedErrorId,
  onCopyBlockWithError,
  borderClass,
}: ValidationErrorBannerProps) {
  if (validationErrors.length === 0) return null;

  const hasErrors = validationErrors.some((e) => !isWarningMessage(e));
  const hasOnlyWarnings = validationErrors.length > 0 && !hasErrors;

  const defaultBorder = hasOnlyWarnings
    ? "border-b border-amber-900/50"
    : "border-b border-rose-900/50";
  const activeBorder = borderClass || defaultBorder;
  const containerBg = hasOnlyWarnings ? "bg-amber-950/35" : "bg-rose-950/40";

  return (
    <div
      className={`${containerBg} ${activeBorder} px-4 py-2 flex items-center justify-between`}
    >
      <div className="flex flex-col space-y-1.5 min-w-0 pr-2">
        {validationErrors.map((err, i) => {
          const isWarn = isWarningMessage(err);
          return (
            <div
              key={i}
              className={`flex items-start text-[11px] leading-tight ${
                isWarn ? "text-amber-300/95" : "text-rose-400/90"
              }`}
            >
              <AlertTriangle
                className={`w-3.5 h-3.5 mr-1.5 shrink-0 ${
                  isWarn ? "text-amber-400" : "text-rose-400"
                }`}
              />
              <span className="font-mono">{err}</span>
            </div>
          );
        })}
      </div>
      {onCopyBlockWithError && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopyBlockWithError(block, validationErrors);
          }}
          className={`px-2 py-1 text-[10px] rounded font-medium transition-colors shrink-0 flex items-center space-x-1 border cursor-pointer ${
            hasOnlyWarnings
              ? "bg-amber-900/50 hover:bg-amber-800/60 text-amber-200 border-amber-700/40"
              : "bg-rose-900/50 hover:bg-rose-800/60 text-rose-200 border-rose-700/40"
          }`}
          title={
            hasOnlyWarnings
              ? "Copy block with warning for AI resolution"
              : "Copy block with error for AI resolution"
          }
        >
          {copiedErrorId === block.id ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>{hasOnlyWarnings ? "Copy with Warning" : "Copy with Error"}</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
