import { handleResponse } from "./client";
import { Ticket, TicketListResponse, TicketResponse } from "../types/ticket";

export const ticketApi = {
  fetchTickets: (): Promise<TicketListResponse> =>
    fetch("/api/tickets").then(handleResponse<TicketListResponse>),

  createTicket: (ticket: Partial<Ticket>): Promise<TicketResponse> =>
    fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ticket),
    }).then(handleResponse<TicketResponse>),

  updateTicket: (
    id: string,
    updates: Partial<Ticket>,
  ): Promise<TicketResponse> =>
    fetch(`/api/tickets/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).then(handleResponse<TicketResponse>),

  deleteTicket: (id: string): Promise<{ success: boolean; error?: string }> =>
    fetch(`/api/tickets/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).then(handleResponse<{ success: boolean; error?: string }>),
};