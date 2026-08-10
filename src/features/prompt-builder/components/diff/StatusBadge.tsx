import { Code2 } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  matchLabel?: string;
  noMatchLabel?: string;
  isCodeMatched?: boolean;
  // When "CREATE", a real search/match was never attempted against file
  // content, so a MATCH FOUND / NOT FOUND pill would be misleading — show
  // a neutral "NEW FILE" pill instead. Any other changeType (or omitted)
  // falls back to the existing match-status pill.
  changeType?: "CREATE" | "EDIT" | "MOVE" | "RENAME";
}

export function StatusBadge({
  status,
  matchLabel = "Match Found",
  noMatchLabel = "Not Found",
  isCodeMatched = false,
  changeType,
}: StatusBadgeProps) {
  return (
    <div className="flex items-center space-x-1.5 shrink-0">
      {changeType === "CREATE" ? (
        <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded border border-blue-500/20 font-bold uppercase shrink-0">
          New File
        </span>
      ) : status === "match" ? (
        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold uppercase shrink-0">
          {matchLabel}
        </span>
      ) : (
        <span className="bg-rose-500/20 text-rose-400 text-[10px] px-1.5 py-0.5 rounded border border-rose-500/20 font-bold uppercase shrink-0">
          {noMatchLabel}
        </span>
      )}

      {isCodeMatched && (
        <span
          className="bg-cyan-500/20 text-cyan-400 text-[10px] px-1.5 py-0.5 rounded border border-cyan-500/30 font-bold uppercase shrink-0 flex items-center"
          title="Target file resolved by matching SEARCH block against codebase content"
        >
          <Code2 className="w-3.5 h-3.5 mr-1" />
          <span>Found by Code</span>
        </span>
      )}
    </div>
  );
}
