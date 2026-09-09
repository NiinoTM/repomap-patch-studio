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

  const startTicketBranch = async (
    ticket: Ticket,
    customTargetBranch?: string,
  ) => {
    const slug = ticket.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const branchName = `${ticket.type}/${ticket.id}-${slug}`;

    try {
      let baseBranch = customTargetBranch || ticket.targetBranch || "main";
      try {
        const branchRes = await branchApi.fetchBranches();
        if (branchRes.success && branchRes.currentBranch) {
          baseBranch = customTargetBranch || branchRes.currentBranch;
        }
      } catch {
        // Fallback to existing or main
      }

      const res = await branchApi.createBranch({ name: branchName });
      if (res.success) {
        await ticketApi.updateTicket(ticket.id, {
          status: "in-progress",
          branch: branchName,
          targetBranch: baseBranch,
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
    shipTicket,
  };
}

export const shipTicket = async (
  ticket: Ticket,
  targetBranchOrOnDone?: string | (() => void),
  onDone?: () => void,
) => {
  if (!ticket.branch) {
    alert("This ticket does not have a dedicated branch to merge.");
    return;
  }

  const customTarget =
    typeof targetBranchOrOnDone === "string" ? targetBranchOrOnDone : undefined;
  const callback =
    typeof targetBranchOrOnDone === "function" ? targetBranchOrOnDone : onDone;
  const target = customTarget || ticket.targetBranch || "main";

  if (!customTarget) {
    const confirmMerge = confirm(
      `Ship & Merge: Are you ready to merge "${ticket.branch}" into "${target}" and mark ${ticket.id} as Done?`,
    );
    if (!confirmMerge) return;
  }

  try {
    const res = await branchApi.mergeBranch({
      sourceBranch: ticket.branch,
      targetBranch: target,
    });
    if (res.success) {
      await ticketApi.updateTicket(ticket.id, {
        status: "done",
        targetBranch: target,
      });
      alert(`🚀 Successfully merged ${ticket.branch} into ${target}!`);
      callback?.();
    } else {
      alert(`Merge failed: ${res.error || "Ensure working directory is clean"}`);
    }
  } catch (err) {
    console.error("Failed to ship ticket:", err);
    alert("Failed to ship ticket. Check backend logs.");
  }
};