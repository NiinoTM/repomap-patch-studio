import { useState, useEffect } from "react";
import { DiffBlock } from "../../../types/patch";
import { patchApi } from "../../../api/patchApi";

interface UseApplyChangesParams {
  diffBlocks: DiffBlock[];
  onApplySuccess?: () => void;
  autoValidate?: boolean;
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

export function useApplyChanges({
  diffBlocks,
  onApplySuccess,
  autoValidate = false,
}: UseApplyChangesParams) {
  const [isApplying, setIsApplying] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const blocksJson = JSON.stringify(diffBlocks);

  useEffect(() => {
    if (!autoValidate) return;

    const blocks = JSON.parse(blocksJson) as DiffBlock[];
    if (blocks.length === 0) {
      setValidationErrors([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsValidating(true);
      try {
        const data = await patchApi.apply({ blocks, dryRun: true });
        if (data.success) {
          setValidationErrors([]);
        } else if (data.details) {
          setValidationErrors(data.details);
        } else {
          setValidationErrors([data.error || "Unknown validation error"]);
        }
      } catch {
        setValidationErrors([
          "Failed to connect to local server for validation.",
        ]);
      } finally {
        setIsValidating(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [blocksJson, autoValidate]);

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
      if (data.success) {
        setValidationErrors([]);
        return true;
      }

      const errors = data.details || [data.error || "Unknown error"];
      setValidationErrors(errors);

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

  return {
    isApplying,
    isValidating,
    validationErrors,
    applyChanges,
    validateDryRun,
  };
}
