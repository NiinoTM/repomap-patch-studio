import { useState, useEffect, useCallback } from "react";
import { Ticket, TicketStatus } from "../../../types/ticket";
import { ticketApi } from "../../../api/ticketApi";
import { branchApi } from "../../../api/branchApi";

export function useTickets(onBranchChange?: () => void) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const refreshTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await ticketApi.fetchTickets();
      if (res.success) {
        setTickets(res.tickets);
      }
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTickets();
  }, [refreshTickets]);

  const activeTicket = tickets.find((t) => t.id === activeTicketId) || null;

  const createTicket = async (data: Partial<Ticket>) => {
    try {
      const res = await ticketApi.createTicket(data);
      if (res.success) {
        await refreshTickets();
        setActiveTicketId(res.ticket.id);
        setIsCreateOpen(false);
        return res.ticket;
      }
    } catch (err) {
      console.error("Failed to create ticket:", err);
    }
    return null;
  };

  const updateStatus = async (id: string, status: TicketStatus) => {
    try {
      const res = await ticketApi.updateTicket(id, { status });
      if (res.success) {
        setTickets((prev) => prev.map((t) => (t.id === id ? res.ticket : t)));
      }
    } catch (err) {
      console.error("Failed to update ticket status:", err);
    }
  };

  const deleteTicket = async (id: string) => {
    if (!confirm(`Are you sure you want to delete ticket ${id}?`)) return;
    try {
      const res = await ticketApi.deleteTicket(id);
      if (res.success) {
        if (activeTicketId === id) setActiveTicketId(null);
        setTickets((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete ticket:", err);
    }
  };

  const startTicketBranch = async (ticket: Ticket) => {
    const slug = ticket.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const branchName = `${ticket.type}/${ticket.id}-${slug}`;

    try {
      const res = await branchApi.createBranch({ name: branchName });
      if (res.success) {
        await ticketApi.updateTicket(ticket.id, {
          status: "in-progress",
          branch: branchName,
        });
        setActiveTicketId(ticket.id);
        await refreshTickets();
        onBranchChange?.();
      } else {
        alert(`Failed to create branch: ${res.error}`);
      }
    } catch (err) {
      console.error("Failed to create ticket branch:", err);
    }
  };

  return {
    tickets,
    activeTicket,
    activeTicketId,
    setActiveTicketId,
    isLoading,
    isManagerOpen,
    setIsManagerOpen,
    isCreateOpen,
    setIsCreateOpen,
    refreshTickets,
    createTicket,
    updateStatus,
    deleteTicket,
    startTicketBranch,
  };
}