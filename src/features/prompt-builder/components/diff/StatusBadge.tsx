interface StatusBadgeProps {
  status: string;
  matchLabel?: string;
  noMatchLabel?: string;
}

export function StatusBadge({
  status,
  matchLabel = "Match Found",
  noMatchLabel = "Not Found",
}: StatusBadgeProps) {
  return status === "match" ? (
    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold uppercase shrink-0">
      {matchLabel}
    </span>
  ) : (
    <span className="bg-rose-500/20 text-rose-400 text-[10px] px-1.5 py-0.5 rounded border border-rose-500/20 font-bold uppercase shrink-0">
      {noMatchLabel}
    </span>
  );
}
