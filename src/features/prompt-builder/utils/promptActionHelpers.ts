import { Ticket } from "../../../types/ticket";
import { filesApi } from "../../../api/repoApi";
import { ticketApi } from "../../../api/ticketApi";
import { formatActiveFilesContext } from "./promptTemplates";
import { sanitizeSocraticAnswers } from "./socraticPrompt";
import {
  ContextSelectionItem,
  ContextSelectionSet,
  getContextItemKey,
  parseContextItem,
  extractContextItemsFromText,
} from "../../../types/contextSelection";

function parseEntryToItem(entry: unknown): ContextSelectionItem | null {
  if (typeof entry === "string") {
    return parseContextItem(entry);
  }
  if (entry && typeof entry === "object" && "type" in entry) {
    return entry as ContextSelectionItem;
  }
  return null;
}

function collectSelectionItems(
  selectedFiles:
    | Set<string>
    | ContextSelectionSet
    | ContextSelectionItem[]
    | string[],
  requestText?: string,
): ContextSelectionItem[] {
  const items: ContextSelectionItem[] = [];

  if (selectedFiles instanceof ContextSelectionSet) {
    items.push(...selectedFiles.getItems());
  } else if (Array.isArray(selectedFiles) || selectedFiles instanceof Set) {
    for (const entry of selectedFiles) {
      const parsed = parseEntryToItem(entry);
      if (parsed) items.push(parsed);
    }
  }

  if (requestText) {
    items.push(...extractContextItemsFromText(requestText));
  }

  return items;
}

async function fetchBoundedItem(item: ContextSelectionItem): Promise<string | null> {
  try {
    const res =
      item.type === "range"
        ? await filesApi.fetchBoundedContext(item.path, [item.start, item.end])
        : item.type === "symbol"
          ? await filesApi.fetchBoundedContext(item.path, undefined, item.symbol)
          : null;
    return res?.success && res.content ? res.content : null;
  } catch (err) {
    console.warn(`Failed to fetch bounded content for ${item.path}`, err);
    return null;
  }
}

async function fetchStandardFiles(files: { key: string; path: string }[]): Promise<Record<string, string>> {
  if (files.length === 0) return {};
  const contents: Record<string, string> = {};
  try {
    const data = await filesApi.fetchFiles(files.map((s) => s.path));
    if (data.contents) {
      for (const item of files) {
        const fileContent = data.contents[item.path];
        if (fileContent) {
          contents[item.key] = fileContent;
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch standard files content:", err);
  }
  return contents;
}

export async function fetchActiveFilesContent(
  selectedFiles:
    | Set<string>
    | ContextSelectionSet
    | ContextSelectionItem[]
    | string[],
  requestText?: string,
): Promise<string> {
  const items = collectSelectionItems(selectedFiles, requestText);
  const uniqueItemsMap = new Map<string, ContextSelectionItem>();
  for (const item of items) {
    uniqueItemsMap.set(getContextItemKey(item), item);
  }

  if (uniqueItemsMap.size === 0) {
    return "No specific files selected.";
  }

  const standardFiles: { key: string; path: string }[] = [];
  const contents: Record<string, string> = {};

  for (const [key, item] of uniqueItemsMap.entries()) {
    if (item.type === "file") {
      standardFiles.push({ key, path: item.path });
    } else {
      const content = await fetchBoundedItem(item);
      if (content) {
        contents[key] = content;
      }
    }
  }

  const standardContents = await fetchStandardFiles(standardFiles);
  Object.assign(contents, standardContents);

  return formatActiveFilesContext(Array.from(uniqueItemsMap.keys()), contents);
}

export async function persistSocraticRequirement(
  ticket: Ticket | null | undefined,
  answersText: string,
) {
  if (!ticket) return;
  const check = sanitizeSocraticAnswers(answersText);
  const currentReqs = ticket.requirements || [];
  const newReq = `[Socratic] ${check.sanitized.slice(0, 120)}`;
  if (!currentReqs.includes(newReq)) {
    const updatedReqs = [...currentReqs, newReq];
    try {
      await ticketApi.updateTicket(ticket.id, { requirements: updatedReqs });
      ticket.requirements = updatedReqs;
    } catch (err) {
      console.error("Failed to persist requirements to ticket on disk:", err);
    }
  }
}

export function formatExtractedContracts(contracts: unknown): string {
  if (!contracts || typeof contracts !== "object") return "";
  return Object.entries(contracts as Record<string, string>)
    .filter(([filePath, content]) => Boolean(filePath && content && content.trim()))
    .map(([filePath, content]) => `// --- ${filePath} ---\n${content.trim()}`)
    .join("\n\n");
}

export async function fetchUpstreamContracts(completedPaths: string[]): Promise<string> {
  if (completedPaths.length === 0) return "";
  try {
    const res = await fetch("/api/repo/extract-contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths: completedPaths }),
    });
    if (!res.ok) {
      const fallback = await fetch("/api/extract-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: completedPaths }),
      });
      if (!fallback.ok) return "";
      const fbData = await fallback.json();
      return formatExtractedContracts(fbData.contracts);
    }
    const data = await res.json();
    return formatExtractedContracts(data.contracts);
  } catch {
    return "";
  }
}