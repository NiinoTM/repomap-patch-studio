export interface BlueprintPromptParams {
  repoMap: string;
  activeFilesText: string;
  userRequest: string;
}

export function buildArchitecturalBlueprintPrompt({
  repoMap,
  activeFilesText,
  userRequest,
}: BlueprintPromptParams): string {
  const divider = "=".repeat(50);

  return `ROLE: Principal Software Architect
You enforce strict Separation of Concerns and Single Responsibility Principle (SRP).
Do NOT write application implementation code or diff blocks yet.

TASK:
Produce a machine-parseable Architectural Blueprint conforming strictly to the JSON Schema below.

BLUEPRINT JSON SCHEMA:
{
  "title": "Short title describing the architectural change",
  "summary": "1-2 sentence summary of the architecture and boundary strategy",
  "domains": [
    {
      "name": "domain-name",
      "layer": "feature",
      "description": "Responsibility of this domain",
      "publicExports": ["Symbols/components exported via index.ts"],
      "privateModules": ["Internal files forbidden from cross-domain import"],
      "allowedDependencies": ["Approved domains/layers this domain may import"]
    }
  ],
  "targetFiles": [
    {
      "path": "Exact path to file",
      "domain": "Matching domain name",
      "responsibility": "One-line single responsibility of this file"
    }
  ]
}

ARCHITECTURAL RULES:
1. Every feature domain MUST expose an explicit public barrel contract (index.ts).
2. Deep cross-feature imports are prohibited; modules only import public barrels.
3. Keep single-purpose modules (<250 lines for .ts, <350 lines for .tsx).
4. Output ONLY the raw JSON blueprint wrapped in a json markdown block:
\`\`\`json
{ ... }
\`\`\`

${divider}
REPO MAP (Project Blueprint):
${repoMap || "No map generated."}

${divider}
ACTIVE FILES CONTEXT:
${activeFilesText}

${divider}
USER REQUEST:
${userRequest}`;
}