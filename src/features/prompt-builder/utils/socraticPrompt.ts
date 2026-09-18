import { Ticket } from "../../../types/ticket";

export interface SocraticPromptParams {
  repoMap: string;
  activeFilesText: string;
  userRequest: string;
  activeTicket?: Ticket | null;
}

export function sanitizeSocraticAnswers(rawText: string): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  const trimmed = (rawText || "").trim();
  if (!trimmed) {
    return {
      isValid: false,
      sanitized: "",
      error: "Confrontation answers cannot be empty.",
    };
  }
  if (trimmed.length < 15) {
    return {
      isValid: false,
      sanitized: trimmed,
      error: "Please provide at least 15 characters to resolve the architectural challenges.",
    };
  }
  return {
    isValid: true,
    sanitized: trimmed,
  };
}

export function buildSocraticConfrontationPrompt({
  repoMap,
  activeFilesText,
  userRequest,
  activeTicket,
}: SocraticPromptParams): string {
  const divider = "-".repeat(50);
  const ticketContext = activeTicket
    ? `ACTIVE TICKET: [${activeTicket.id}] ${activeTicket.title}\n${activeTicket.description || ""}\nRequirements:\n${(activeTicket.requirements || []).map((r) => `- ${r}`).join("\n")}\n\n`
    : "";

  return `ROLE: Adversarial Principal Architect & Logic Interrogator
You enforce strict Separation of Concerns, edge-case resilience, and business logic clarity.
Do NOT write application code, diff blocks, or implementation files yet.

TASK:
Aggressively interrogate and stress-test the user's request below. Identify every missing rule, unhandled failure mode, and hidden assumption.

CHALLENGE VECTORS (Inspect each vector critically):
1. MISSING DOMAIN & ROUTING LOGIC: How are entities matched, prioritized, or linked? (e.g. matching criteria, filtering, sorting).
2. FAILURE MODES & TIMEOUTS: What happens when an external service, user, or worker times out, rejects, or fails? What is the SLA and fallback state?
3. CONCURRENCY & IDEMPOTENCY: What prevents double-clicks, duplicate events, race conditions, or multiple workers claiming the same entity?
4. EDGE CONDITIONS & BOUNDARIES: What happens with 0 matches, empty inputs, max capacity limits, or permission boundaries?

OUTPUT FORMAT:
Output 3 to 5 numbered, sharp challenges.
For each challenge, provide 2-3 concrete options (e.g., Option A vs. Option B) so the developer can choose or clarify immediately.
Conclude with a bulleted "Suggested Fortified Acceptance Criteria" checklist.

${ticketContext}${divider}
REPO MAP:
${repoMap || "No map generated."}

${divider}
ACTIVE FILES CONTEXT:
${activeFilesText || "No files selected."}

${divider}
USER REQUEST TO INTERROGATE:
${userRequest || "No request provided."}`;
}