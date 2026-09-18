export interface BlueprintDiscoveryPromptParams {
  repoMap: string;
  activeFilesText?: string;
  userRequest: string;
}

export function buildArchitecturalDiscoveryPrompt({
  repoMap,
  activeFilesText = "",
  userRequest,
}: BlueprintDiscoveryPromptParams): string {
  const divider = "=".repeat(50);
  const activeContextSection = activeFilesText.trim()
    ? `CURRENT ACTIVE FILES CONTEXT:\n${activeFilesText}\n\n`
    : "";

  return `ROLE: Principal Architectural Reconnaissance & Discovery Engineer
You analyze large-scale codebases to discover key domain files, architectural boundaries, and prerequisite types before blueprint creation.
Do NOT write application implementation code or diff blocks yet.

TASK:
Analyze the project REPO MAP against the USER REQUEST to discover relevant existing files, architectural boundaries, and dependencies required to properly architect this feature.
Conform strictly to the JSON Schema below.

DISCOVERY JSON SCHEMA:
{
  "summary": "1-2 sentence assessment of existing modules and missing architectural context",
  "candidates": [
    {
      "path": "Exact relative path to existing file in the repo map",
      "domain": "Inferred or matching domain name",
      "reason": "Specific technical reason why this file must be inspected/modified",
      "layer": "feature", // One of: "feature" | "server-service" | "server-adapter" | "api" | "utils"
      "confidence": 0.95
    }
  ],
  "suggestedPhases": [
    "Phase 1: Contracts & Types",
    "Phase 2: Core Domain Services",
    "Phase 3: UI & Presentation"
  ]
}

DISCOVERY RULES:
1. Reference ONLY real, existing file paths found in the REPO MAP below. Never invent speculative file paths.
2. Prioritize root type definitions, domain services, and public barrel exports relevant to the user request.
3. Recommend between 2 and 8 high-impact candidate files.
4. Output ONLY the raw JSON wrapped in a json markdown block:
\`\`\`json
{ ... }
\`\`\`

${divider}
REPO MAP (Project Blueprint):
${repoMap || "No map generated."}

${divider}
${activeContextSection}USER REQUEST:
${userRequest}`;
}