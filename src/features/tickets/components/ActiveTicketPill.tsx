import { Ticket } from "../../../types/ticket";
import { CheckSquare, ChevronDown } from "lucide-react";

interface ActiveTicketPillProps {
  activeTicket: Ticket | null;
  onClick: () => void;
}

export function ActiveTicketPill({
  activeTicket,
  onClick,
}: ActiveTicketPillProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 border px-2.5 py-1 rounded-md text-xs font-mono transition-all cursor-pointer ${
        activeTicket
          ? "bg-indigo-950/40 border-indigo-500/40 hover:border-indigo-500 text-indigo-300 shadow-sm"
          : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400"
      }`}
      title="Open In-Repo Ticket Manager"
    >
      <CheckSquare
        className={`w-3.5 h-3.5 ${
          activeTicket ? "text-indigo-400" : "text-zinc-500"
        }`}
      />
      {activeTicket ? (
        <div className="flex items-center space-x-1.5 max-w-[160px] truncate">
          <span className="font-bold text-indigo-200">{activeTicket.id}:</span>
          <span className="truncate text-zinc-200">{activeTicket.title}</span>
        </div>
      ) : (
        <span>Tickets</span>
      )}
      <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
    </button>
  );
}