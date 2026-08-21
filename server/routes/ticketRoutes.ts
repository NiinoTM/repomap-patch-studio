import { Router, Request, Response } from "express";
import { repoState } from "../adapters/gitAdapter";
import {
  ensureDir,
  fileExists,
  joinPath,
  readDir,
  readTextFile,
  removeFile,
  writeTextFile,
} from "../adapters/fsAdapter";

export const ticketRouter = Router();

export interface TicketData {
  id: string;
  title: string;
  status: "todo" | "in-progress" | "done";
  type: "feat" | "fix" | "chore" | "refactor";
  scope?: string;
  branch?: string;
  description?: string;
  requirements?: string[];
  createdAt: string;
  updatedAt?: string;
}

function getTicketsDir(repoPath: string): string {
  const dir = joinPath(repoPath, ".tickets");
  ensureDir(dir);
  return dir;
}

function readAllTickets(repoPath: string): TicketData[] {
  const dir = getTicketsDir(repoPath);
  const files = readDir(dir).filter((f) => f.endsWith(".json"));
  const tickets: TicketData[] = [];

  for (const file of files) {
    try {
      const content = readTextFile(joinPath(dir, file));
      const parsed = JSON.parse(content) as TicketData;
      if (parsed.id && parsed.title) {
        tickets.push(parsed);
      }
    } catch {
      // Skip malformed ticket JSON
    }
  }

  return tickets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function generateNextId(tickets: TicketData[]): string {
  let maxNum = 0;
  for (const t of tickets) {
    const match = t.id.match(/^TICK-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  const nextNum = String(maxNum + 1).padStart(3, "0");
  return `TICK-${nextNum}`;
}

ticketRouter.get("/tickets", (_req: Request, res: Response) => {
  try {
    const repoPath = repoState.getRepoPath();
    const tickets = readAllTickets(repoPath);
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

ticketRouter.post("/tickets", (req: Request, res: Response) => {
  try {
    const repoPath = repoState.getRepoPath();
    const existing = readAllTickets(repoPath);
    const id = req.body.id || generateNextId(existing);

    const newTicket: TicketData = {
      id,
      title: req.body.title || "Untitled Ticket",
      status: req.body.status || "todo",
      type: req.body.type || "feat",
      scope: req.body.scope || "",
      branch: req.body.branch || "",
      description: req.body.description || "",
      requirements: Array.isArray(req.body.requirements)
        ? req.body.requirements
        : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const dir = getTicketsDir(repoPath);
    const filePath = joinPath(dir, `${id}.json`);
    writeTextFile(filePath, JSON.stringify(newTicket, null, 2));

    res.json({ success: true, ticket: newTicket });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

ticketRouter.put("/tickets/:id", (req: Request, res: Response) => {
  try {
    const repoPath = repoState.getRepoPath();
    const dir = getTicketsDir(repoPath);
    const { id } = req.params;
    const filePath = joinPath(dir, `${id}.json`);

    if (!fileExists(filePath)) {
      return res
        .status(404)
        .json({ success: false, error: `Ticket ${id} not found` });
    }

    const current = JSON.parse(readTextFile(filePath)) as TicketData;
    const updated: TicketData = {
      ...current,
      ...req.body,
      id: current.id,
      updatedAt: new Date().toISOString(),
    };

    writeTextFile(filePath, JSON.stringify(updated, null, 2));
    res.json({ success: true, ticket: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

ticketRouter.delete("/tickets/:id", (req: Request, res: Response) => {
  try {
    const repoPath = repoState.getRepoPath();
    const dir = getTicketsDir(repoPath);
    const { id } = req.params;
    const filePath = joinPath(dir, `${id}.json`);

    removeFile(filePath);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});