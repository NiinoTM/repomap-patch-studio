import { CheckSquare } from "lucide-react";
import { Ticket } from "../../../../types/ticket";

interface ActiveTicketBannerProps {
  activeTicket: Ticket;
  onInjectToPrompt: (text: string) => void;
}

export function formatTicketPromptText(ticket: Ticket): string {
  let text = `[${ticket.id}] ${ticket.title}`;
  if (ticket.description) {
    text += `\n\nContext & Description:\n${ticket.description}`;
  }
  if (ticket.requirements && ticket.requirements.length > 0) {
    text += `\n\nAcceptance Criteria / Requirements Checklist:\n${ticket.requirements
      .map((r) => `- [ ] ${r}`)
      .join("\n")}`;
  }
  return text;
}

export function ActiveTicketBanner({
  activeTicket,
  onInjectToPrompt,
}: ActiveTicketBannerProps) {
  const handleInject = () => {
    const text = formatTicketPromptText(activeTicket);
    onInjectToPrompt(text);
  };

  return (
    <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-lg p-2 flex items-center justify-between text-xs">
      <div className="flex items-center space-x-2 min-w-0">
        <CheckSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span className="font-bold text-indigo-200 font-mono shrink-0">
          {activeTicket.id}:
        </span>
        <span className="text-zinc-300 truncate font-sans">
          {activeTicket.title}
        </span>
      </div>
      <button
        onClick={handleInject}
        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono shrink-0 ml-2 hover:underline cursor-pointer"
      >
        + Inject to prompt
      </button>
    </div>
  );
}