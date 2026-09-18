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

EPISTEMIC GROUNDING RULE (Context vs. Concept):
Distinguish between (A) Pure Conceptual / Greenfield logic and (B) Existing Implementation / Brownfield behavior.
If the user's request references existing UI components, state machines, or code behavior not loaded in ACTIVE FILES CONTEXT, DO NOT invent speculative failure modes about code you cannot see. Explicitly challenge the lack of prerequisite file visibility first.

CHALLENGE VECTORS (Inspect each vector critically):
0. EVIDENCE & CONTEXT SUFFICIENCY: Are governing files missing from ACTIVE FILES CONTEXT? Challenge blindspot assumptions before speculating on code flaws.
1. MISSING DOMAIN & ROUTING LOGIC: How are entities matched, prioritized, or linked? (e.g. matching criteria, filtering, sorting).
2. FAILURE MODES & TIMEOUTS: What happens when an external service, user, or worker times out, rejects, or fails? What is the SLA and fallback state?
3. CONCURRENCY & IDEMPOTENCY: What prevents double-clicks, duplicate events, race conditions, or multiple workers claiming the same entity?
4. EDGE CONDITIONS & BOUNDARIES: What happens with 0 matches, empty inputs, max capacity limits, or dismissal/teardown lifecycles?

OUTPUT FORMAT:
Output 3 to 5 numbered, sharp challenges.
- If the request targets existing code behavior lacking files in ACTIVE FILES CONTEXT, Challenge 1 MUST name the prerequisite files needed from the REPO MAP and explain what cannot be determined without them.
- For each challenge, provide 2-3 concrete options (e.g., Option A vs. Option B) so the developer can choose or clarify immediately.
Conclude with a bulleted "Suggested Fortified Acceptance Criteria" checklist.

PREREQUISITE CONTEXT BLOCK:
If any governing or prerequisite files were identified as missing from ACTIVE FILES CONTEXT, you MUST append this exact block at the very end of your response:
\`\`\`context
FILES NEEDED:
- path/to/file.ext — one-line reason why inspecting this file is required
\`\`\`

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