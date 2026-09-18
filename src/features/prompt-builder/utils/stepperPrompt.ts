import type { BlueprintTargetFile } from "../../../types/remediation";

export function getLayerRank(filePath: string): number {
  const lower = filePath.toLowerCase();
  if (lower.includes("/types/") || lower.endsWith(".d.ts") || lower.includes("contract")) {
    return 1;
  }
  if (lower.includes("/adapters/") || lower.includes("/utils/") || lower.includes("/lib/")) {
    return 2;
  }
  if (lower.includes("/services/") || lower.includes("/api/")) {
    return 3;
  }
  if (lower.includes("/hooks/") || lower.includes("/use")) {
    return 4;
  }
  if (lower.includes("/components/") || lower.endsWith(".tsx")) {
    return 5;
  }
  return 6;
}

export function sortTargetFilesTopologically(
  files: BlueprintTargetFile[],
): BlueprintTargetFile[] {
  return [...files].sort((a, b) => getLayerRank(a.path) - getLayerRank(b.path));
}

export interface StepScopedPromptParams {
  stepNumber: number;
  totalSteps: number;
  targetFile: BlueprintTargetFile;
  completedSteps: string[];
  activeFilesText: string;
  repoMap: string;
  userRequest: string;
}

export function buildStepScopedPrompt({
  stepNumber,
  totalSteps,
  targetFile,
  completedSteps,
  activeFilesText,
  repoMap,
  userRequest,
}: StepScopedPromptParams): string {
  const divider = "-".repeat(50);
  const completedSummary =
    completedSteps.length > 0
      ? `UPSTREAM COMPLETED STEPS (Already Implemented):\n${completedSteps.map((s) => `• ${s}`).join("\n")}\n\n`
      : "";

  return `ROLE: Senior Software Architect & Modular Implementation Engineer
You write clean, production-grade, type-safe code following Single Responsibility Principle (SRP).

TASK:
Implement ONLY STEP ${stepNumber} of ${totalSteps} in the architectural plan.

CURRENT TARGET SCOPE:
- Target File: ${targetFile.path}
- Target Domain: ${targetFile.domain}
- Step Responsibility: ${targetFile.responsibility}

${completedSummary}STRICT IMPLEMENTATION CONSTRAINTS:
1. Implement ONLY the changes for "${targetFile.path}". Do not write code for other steps or files.
2. Rely strictly on existing types and upstream completed steps.
3. Wrap all modifications in exact SEARCH/REPLACE blocks.

${divider}
ACTIVE CONTEXT FILES:
${activeFilesText || "No context files selected."}

${divider}
REPO MAP:
${repoMap || "No map generated."}

${divider}
OVERALL FEATURE REQUEST:
${userRequest}`;
}