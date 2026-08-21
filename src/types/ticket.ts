export type TicketStatus = "todo" | "in-progress" | "done";
export type TicketType = "feat" | "fix" | "chore" | "refactor";

export interface Ticket {
  id: string;
  title: string;
  status: TicketStatus;
  type: TicketType;
  scope?: string;
  branch?: string;
  description?: string;
  requirements?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface TicketListResponse {
  success: boolean;
  tickets: Ticket[];
  error?: string;
}

export interface TicketResponse {
  success: boolean;
  ticket: Ticket;
  error?: string;
}