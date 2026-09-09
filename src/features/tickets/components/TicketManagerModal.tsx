import { useState } from "react";
import { Ticket, TicketStatus } from "../../../types/ticket";
import { ShipTicketDialog } from "./ShipTicketDialog";
import { TicketCard } from "./TicketCard";
import {
  CheckSquare,
  Plus,
  X,
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
  onShipTicket: (ticket: Ticket, targetBranch?: string) => void;
  onDeleteTicket: (id: string) => void;
  onCreateOpen: () => void;
}

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

export function TicketManagerModal({
  isOpen,
  onClose,
  tickets,
  activeTicketId,
  onSelectActive,
  onStatusChange,
  onStartBranch,
  onShipTicket,
  onDeleteTicket,
  onCreateOpen,
}: TicketManagerModalProps) {
  const [filter, setFilter] = useState<string>("" );
  const [shippingTicket, setShippingTicket] = useState<Ticket | null>(null);

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
                        onShipTicket={() => setShippingTicket(t)}
                        onDeleteTicket={() => onDeleteTicket(t.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {shippingTicket && (
          <ShipTicketDialog
            ticket={shippingTicket}
            onClose={() => setShippingTicket(null)}
            onConfirm={(ticket, target) => {
              setShippingTicket(null);
              onShipTicket(ticket, target);
            }}
          />
        )}
      </div>
    </div>
  );
}