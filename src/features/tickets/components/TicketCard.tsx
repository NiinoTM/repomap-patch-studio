import { Ticket, TicketStatus, TicketType } from "../../../types/ticket";
import { GitBranch, Trash2, ListChecks, Check } from "lucide-react";

const TYPE_STYLES: Record<
  TicketType,
  { bg: string; text: string; border: string }
> = {
  feat: {
    bg: "bg-indigo-950/60",
    text: "text-indigo-300",
    border: "border-indigo-800/50",
  },
  fix: {
    bg: "bg-rose-950/60",
    text: "text-rose-300",
    border: "border-rose-800/50",
  },
  refactor: {
    bg: "bg-purple-950/60",
    text: "text-purple-300",
    border: "border-purple-800/50",
  },
  chore: {
    bg: "bg-zinc-800/60",
    text: "text-zinc-400",
    border: "border-zinc-700/50",
  },
};

export interface TicketCardProps {
  ticket: Ticket;
  isActive: boolean;
  onSelectActive: () => void;
  onStatusChange: (status: TicketStatus) => void;
  onStartBranch: () => void;
  onShipTicket: () => void;
  onDeleteTicket: () => void;
}

export function TicketCard({
  ticket,
  isActive,
  onSelectActive,
  onStatusChange,
  onStartBranch,
  onShipTicket,
  onDeleteTicket,
}: TicketCardProps) {
  const typeStyle = TYPE_STYLES[ticket.type] || TYPE_STYLES.chore;

  return (
    <div
      className={`min-w-0 w-full rounded-xl p-3.5 flex flex-col space-y-2.5 transition-all group relative border ${
        isActive
          ? "bg-indigo-950/30 border-indigo-500/60 shadow-lg shadow-indigo-950/40"
          : "bg-zinc-900/90 border-zinc-800/90 hover:border-zinc-700"
      }`}
    >
      {/* Card Header: ID, Type, Scope, and Focus Action */}
      <div className="flex items-center justify-between min-w-0">
        <div className="flex items-center space-x-1.5 min-w-0 flex-wrap gap-y-1">
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 shrink-0">
            {ticket.id}
          </span>
          <span
            className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border} shrink-0`}
          >
            {ticket.type}
          </span>
          {ticket.scope && (
            <span className="text-[9px] font-mono text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded truncate max-w-[100px]">
              ({ticket.scope})
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={onSelectActive}
            className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium transition-all cursor-pointer flex items-center space-x-1 ${
              isActive
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
            title={isActive ? "Active in Workspace" : "Set as Active Ticket"}
          >
            {isActive && <Check className="w-3 h-3" />}
            <span>{isActive ? "Active" : "Focus"}</span>
          </button>
          <button
            onClick={onDeleteTicket}
            className="text-zinc-600 hover:text-rose-400 p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Delete ticket"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Title & Description */}
      <div className="min-w-0">
        <div className="text-xs font-semibold text-zinc-100 leading-snug break-words">
          {ticket.title}
        </div>
        {ticket.description && (
          <div className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed font-sans mt-1 break-words">
            {ticket.description}
          </div>
        )}
      </div>

      {/* Metadata Chips: Branch & Criteria */}
      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
        {ticket.branch && (
          <div
            className="flex items-center space-x-1 text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-900/50 max-w-full truncate"
            title={`Branch: ${ticket.branch}${ticket.targetBranch ? ` → ${ticket.targetBranch}` : ""}`}
          >
            <GitBranch className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{ticket.branch}</span>
            {ticket.targetBranch && (
              <span className="text-zinc-500 font-sans">→ {ticket.targetBranch}</span>
            )}
          </div>
        )}

        {ticket.requirements && ticket.requirements.length > 0 && (
          <div className="flex items-center space-x-1 text-[10px] font-mono text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800/80">
            <ListChecks className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
            <span>{ticket.requirements.length} criteria</span>
          </div>
        )}
      </div>

      {/* Footer: Start Branch, Ship & Merge, and 1-Click Status Mover */}
      <div className="pt-2 flex items-center justify-between border-t border-zinc-800/70 min-w-0">
        {ticket.status === "in-progress" && ticket.branch ? (
          <button
            onClick={onShipTicket}
            className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-mono text-[10px] font-semibold bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded transition-all cursor-pointer shadow-sm hover:bg-emerald-900/60"
            title={`Merge branch to ${ticket.targetBranch || "main"} and complete ticket`}
          >
            <span>🚀 Ship to {ticket.targetBranch || "main"}</span>
          </button>
        ) : !ticket.branch && ticket.status !== "done" ? (
          <button
            onClick={onStartBranch}
            className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 text-[10px] font-mono transition-colors cursor-pointer"
            title="Create branch and start work"
          >
            <GitBranch className="w-3 h-3" />
            <span>Start Branch</span>
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center space-x-0.5 bg-zinc-950 p-0.5 rounded-lg border border-zinc-800/80 shrink-0">
          {(["todo", "in-progress", "done"] as TicketStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => onStatusChange(st)}
              className={`px-1.5 py-0.5 text-[9px] font-mono rounded capitalize transition-all cursor-pointer ${
                ticket.status === st
                  ? st === "done"
                    ? "bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/60"
                    : st === "in-progress"
                      ? "bg-amber-950 text-amber-300 font-bold border border-amber-800/60"
                      : "bg-zinc-800 text-zinc-200 font-bold border border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
              }`}
              title={`Move to ${st}`}
            >
              {st === "in-progress" ? "Prog" : st}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}