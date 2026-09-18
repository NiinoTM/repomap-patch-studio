export interface AutoHealPromptParams {
  validationErrors: string[];
  failedBlocks?: Array<{ file: string; search: string; replace: string }>;
  activeFilesText?: string;
}

export function buildAutoHealPrompt({
  validationErrors,
  failedBlocks = [],
  activeFilesText = "",
}: AutoHealPromptParams): string {
  const searchMarker = "<".repeat(7) + " SEARCH";
  const equalsMarker = "=".repeat(7);
  const replaceMarker = ">".repeat(7) + " REPLACE";

  const formattedErrors = validationErrors
    .map((e, idx) => `${idx + 1}. ${e}`)
    .join("\n");

  const formattedBlocks = failedBlocks
    .map(
      (b) =>
        `FILE: ${b.file}\n${searchMarker}\n${b.search}\n${equalsMarker}\n${b.replace}\n${replaceMarker}`,
    )
    .join("\n\n");

  return `ROLE: Senior Software Architect & Healing Engineer
You are diagnosing and repairing pre-flight validation failures in diff patches.

DIAGNOSTIC ERRORS DETECTED:
${formattedErrors}

FAILED PATCH BLOCKS:
${formattedBlocks || "See active file context."}

${activeFilesText ? `ACTIVE FILES CONTEXT:\n${activeFilesText}\n` : ""}
REMEDIATION INSTRUCTIONS:
1. Analyze the exact syntax, linter, unused variable, or boundary violation errors above.
2. Resolve all unclosed tokens, duplicated punctuation, and illegal cross-feature imports.
3. Emit corrected SEARCH/REPLACE blocks that resolve all errors while strictly preserving the functional intent.
4. Output your answer with exact SEARCH/REPLACE blocks.`;
}