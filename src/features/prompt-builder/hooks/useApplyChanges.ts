import { useState } from "react";
import { DiffBlock } from "../../../types/patch";
import { patchApi } from "../../../api/patchApi";

interface UseApplyChangesParams {
  diffBlocks: DiffBlock[];
  onApplySuccess?: () => void;
}

interface ApplyResult {
  success: boolean;
  error?: string;
  details?: string[];
}

function formatErrorDetails(
  data: ApplyResult,
  abortedLabel: string,
  genericLabel: string,
): string {
  return data.details && Array.isArray(data.details) && data.details.length > 0
    ? `${abortedLabel}\n\n` + data.details.map((d) => `• ${d}`).join("\n")
    : `${genericLabel}\n${data.error || "Unknown error"}`;
}

/**
 * Owns all communication with the patch-apply backend for the Footer.
 * Components using this hook stay presentation-only — no fetch calls,
 * no business rules about what counts as success.
 */
export function useApplyChanges({
  diffBlocks,
  onApplySuccess,
}: UseApplyChangesParams) {
  const [isApplying, setIsApplying] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const applyChanges = async (shouldCommit: boolean, commitMessage: string) => {
    if (diffBlocks.length === 0) {
      alert("No diff blocks detected to apply!");
      return false;
    }

    setIsApplying(true);
    try {
      const data = await patchApi.apply({
        blocks: diffBlocks,
        commitMessage: shouldCommit ? commitMessage : "",
        skipCommit: !shouldCommit,
        commit: shouldCommit,
      });

      if (data.success) {
        alert(
          shouldCommit
            ? "✅ Edits written to disk & committed to Git!"
            : "✅ Edits written to disk!",
        );
        onApplySuccess?.();
        return true;
      }

      alert(
        formatErrorDetails(
          data,
          "❌ Transaction Aborted (0 files modified on disk):",
          "❌ Error applying edits:",
        ),
      );
      return false;
    } catch {
      alert("❌ Failed to connect to local server. Ensure server is running!");
      return false;
    } finally {
      setIsApplying(false);
    }
  };

  const validateDryRun = async () => {
    if (diffBlocks.length === 0) {
      alert("No diff blocks detected to apply!");
      return false;
    }

    setIsValidating(true);
    try {
      const data = await patchApi.apply({ blocks: diffBlocks, dryRun: true });
      if (data.success) return true;

      alert(
        formatErrorDetails(
          data,
          "❌ Validation failed (0 files modified on disk):",
          "❌ Error validating edits:",
        ),
      );
      return false;
    } catch {
      alert("❌ Failed to connect to local server. Ensure server is running!");
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  return { isApplying, isValidating, applyChanges, validateDryRun };
}
