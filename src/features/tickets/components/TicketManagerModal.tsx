import { useState } from "react";
import { Ticket, TicketStatus, TicketType } from "../../../types/ticket";
import {
  CheckSquare,
  Plus,
  GitBranch,
  Trash2,
  X,
  ListChecks,
  Check,
  CircleDot,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface TicketManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: Ticket[];
  activeTicketId: string | null;
  onSelectActive: (id: string | null) => void;
  onStatusChange: (id: string, status: TicketStatus) => void;
  onStartBranch: (ticket: Ticket) => void;
  onDeleteTicket: (id: string) => void;
  onCreateOpen: () => void;
}

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

const COLUMNS: {
  label: string;
  status: TicketStatus;
  icon: typeof CircleDot;
  badgeColor: string;
}[] = [
  {
    label: "To Do",
    status: "todo",
    icon: CircleDot,
    badgeColor: "bg-zinc-800 text-zinc-300",
  },
  {
    label: "In Progress",
    status: "in-progress",
    icon: Clock,
    badgeColor: "bg-amber-950/80 text-amber-300 border border-amber-800/40",
  },
  {
    label: "Done",
    status: "done",
    icon: CheckCircle2,
    badgeColor: "bg-emerald-950/80 text-emerald-300 border border-emerald-800/40",
  },
];

function TicketCard({
  ticket,
  isActive,
  onSelectActive,
  onStatusChange,
  onStartBranch,
  onDeleteTicket,
}: {
  ticket: Ticket;
  isActive: boolean;
  onSelectActive: () => void;
  onStatusChange: (status: TicketStatus) => void;
  onStartBranch: () => void;
  onDeleteTicket: () => void;
}) {
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
            title={ticket.branch}
          >
            <GitBranch className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{ticket.branch}</span>
          </div>
        )}

        {ticket.requirements && ticket.requirements.length > 0 && (
          <div className="flex items-center space-x-1 text-[10px] font-mono text-zinc-400 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800/80">
            <ListChecks className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
            <span>{ticket.requirements.length} criteria</span>
          </div>
        )}
      </div>

      {/* Footer: Start Branch & 1-Click Status Mover */}
      <div className="pt-2 flex items-center justify-between border-t border-zinc-800/70 min-w-0">
        {ticket.status !== "in-progress" && !ticket.branch ? (
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

export function TicketManagerModal({
  isOpen,
  onClose,
  tickets,
  activeTicketId,
  onSelectActive,
  onStatusChange,
  onStartBranch,
  onDeleteTicket,
  onCreateOpen,
}: TicketManagerModalProps) {
  const [filter, setFilter] = useState<string>("");

  if (!isOpen) return null;

  const filteredTickets = tickets.filter(
    (t) =>
      t.title.toLowerCase().includes(filter.toLowerCase()) ||
      t.id.toLowerCase().includes(filter.toLowerCase()) ||
      (t.scope && t.scope.toLowerCase().includes(filter.toLowerCase())),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-zinc-100">
                  In-Repo Task Board
                </h2>
                <span className="text-[9px] bg-indigo-950/80 text-indigo-300 border border-indigo-800/50 px-2 py-0.2 rounded-full font-mono">
                  .tickets/
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono">
                Git-native tasks synced with prompt context and branches
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onCreateOpen}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Ticket</span>
            </button>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-md hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/30 flex items-center justify-between">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter tickets by title, ID, or scope..."
            className="w-full max-w-sm bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none font-sans"
          />
          <span className="text-[11px] font-mono text-zinc-500">
            Total: {tickets.length} tickets
          </span>
        </div>

        {/* 3-Column Kanban Board */}
        <div className="flex-1 overflow-x-auto p-4 grid grid-cols-3 gap-4 custom-scrollbar bg-zinc-950">
          {COLUMNS.map((col) => {
            const colTickets = filteredTickets.filter(
              (t) => t.status === col.status,
            );
            const Icon = col.icon;
            return (
              <div
                key={col.status}
                className="flex flex-col bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 min-w-[260px] overflow-hidden"
              >
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-zinc-800/60">
                  <div className="flex items-center space-x-1.5">
                    <Icon className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      {col.label}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${col.badgeColor}`}
                  >
                    {colTickets.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 custom-scrollbar min-w-0">
                  {colTickets.length === 0 ? (
                    <div className="h-28 flex items-center justify-center border-2 border-dashed border-zinc-800/60 rounded-xl text-[11px] text-zinc-600 font-mono">
                      No tickets in {col.label}
                    </div>
                  ) : (
                    colTickets.map((t) => (
                      <TicketCard
                        key={t.id}
                        ticket={t}
                        isActive={t.id === activeTicketId}
                        onSelectActive={() =>
                          onSelectActive(t.id === activeTicketId ? null : t.id)
                        }
                        onStatusChange={(st) => onStatusChange(t.id, st)}
                        onStartBranch={() => onStartBranch(t)}
                        onDeleteTicket={() => onDeleteTicket(t.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}