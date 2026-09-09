import { useState, useEffect } from "react";
import { DiffBlock } from "../../../types/patch";
import { ApplyProgressEvent } from "../../../types/api";
import { patchApi } from "../../../api/patchApi";

interface ApplyStageState {
  stage: string;
  label: string;
  status: "start" | "done" | "error";
  durationMs?: number;
}

interface UseApplyChangesParams {
  diffBlocks: DiffBlock[];
  onApplySuccess?: () => void;
  autoValidate?: boolean;
}

interface ApplyResult {
  success: boolean;
  error?: string;
  details?: string[];
  warnings?: string[];
}

function formatErrorDetails(
  data: ApplyResult,
  abortedLabel: string,
  genericLabel: string,
): string {
  const isOnlyWarnings =
    data.details &&
    Array.isArray(data.details) &&
    data.details.length > 0 &&
    data.details.every((d) => d.toLowerCase().includes("warning"));

  const label = isOnlyWarnings
    ? "⚠️ Validation Warnings (0 files modified on disk):"
    : abortedLabel;

  return data.details && Array.isArray(data.details) && data.details.length > 0
    ? `${label}\n\n` + data.details.map((d) => `• ${d}`).join("\n")
    : `${genericLabel}\n${data.error || "Unknown error"}`;
}

function normalizeBlocks(blocks: DiffBlock[]): DiffBlock[] {
  return blocks.map((b) => ({
    ...b,
    file: b.matchedFile || b.file,
  }));
}

function updateStages(prev: ApplyStageState[], event: ApplyProgressEvent): ApplyStageState[] {
  const idx = prev.findIndex((s) => s.stage === event.stage);
  const updated: ApplyStageState = {
    stage: event.stage,
    label: event.label,
    status: event.status,
    durationMs: event.durationMs,
  };
  if (idx === -1) return [...prev, updated];
  const next = [...prev];
  next[idx] = updated;
  return next;
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error && err.message
    ? err.message
    : "Failed to connect to local server. Ensure server is running!";
}

async function performAutoValidation(
  rawBlocks: DiffBlock[],
  setIsValidating: (v: boolean) => void,
  setValidationErrors: (errs: string[]) => void,
) {
  setIsValidating(true);
  try {
    const blocks = normalizeBlocks(rawBlocks);
    const data = await patchApi.applyStream({ blocks, dryRun: true }, () => {});
    if (data.success) {
      const warnings = data.warnings || data.details || [];
      setValidationErrors(warnings);
    } else if (data.details) {
      setValidationErrors(data.details);
    } else {
      setValidationErrors([data.error || "Unknown validation error"]);
    }
  } catch {
    setValidationErrors(["Failed to connect to local server for validation."]);
  } finally {
    setIsValidating(false);
  }
}

export function useApplyChanges({
  diffBlocks,
  onApplySuccess,
  autoValidate = true,
}: UseApplyChangesParams) {
  const [isApplying, setIsApplying] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [stages, setStages] = useState<ApplyStageState[]>([]);

  const handleProgress = (event: ApplyProgressEvent) => {
    setStages((prev) => updateStages(prev, event));
  };

  const blocksJson = JSON.stringify(diffBlocks);

  useEffect(() => {
    if (!autoValidate) return;

    const rawBlocks = JSON.parse(blocksJson) as DiffBlock[];
    if (rawBlocks.length === 0) {
      setValidationErrors([]);
      return;
    }

    const timer = setTimeout(() => {
      performAutoValidation(rawBlocks, setIsValidating, setValidationErrors);
    }, 300);

    return () => clearTimeout(timer);
  }, [blocksJson, autoValidate]);

  const applyChanges = async (shouldCommit: boolean, commitMessage: string) => {
    if (diffBlocks.length === 0 && !shouldCommit) {
      alert("No diff blocks detected to apply!");
      return false;
    }

    setIsApplying(true);
    setStages([]);
    try {
      const normalizedBlocks = normalizeBlocks(diffBlocks);
      const data = await patchApi.applyStream(
        {
          blocks: normalizedBlocks,
          commitMessage: shouldCommit ? commitMessage : "",
          skipCommit: !shouldCommit,
          commit: shouldCommit,
        },
        handleProgress,
      );

      if (data.success) {
        const warnings = data.warnings || data.details || [];
        if (warnings.length > 0) setValidationErrors(warnings);
        alert(shouldCommit ? "✅ Edits written to disk & committed to Git!" : "✅ Edits written to disk!");
        onApplySuccess?.();
        return true;
      }

      alert(formatErrorDetails(data, "❌ Transaction Aborted (0 files modified on disk):", "❌ Error applying edits:"));
      return false;
    } catch (err: unknown) {
      alert(`❌ ${getErrorMessage(err)}`);
      return false;
    } finally {
      setIsApplying(false);
    }
  };

  const validateDryRun = async () => {
    if (diffBlocks.length === 0) return true;

    setIsValidating(true);
    try {
      const normalizedBlocks = normalizeBlocks(diffBlocks);
      const data = await patchApi.applyStream(
        { blocks: normalizedBlocks, dryRun: true },
        handleProgress,
      );
      if (data.success) {
        const warnings = data.warnings || data.details || [];
        setValidationErrors(warnings);
        if (warnings.length > 0) {
          alert(formatErrorDetails(data, "⚠️ Pre-flight validation passed with warnings:", "⚠️ Validation Warnings:"));
        }
        return true;
      }

      const errors = data.details || [data.error || "Unknown error"];
      setValidationErrors(errors);
      alert(formatErrorDetails(data, "❌ Validation failed (0 files modified on disk):", "❌ Error validating edits:"));
      return false;
    } catch (err: unknown) {
      alert(`❌ ${getErrorMessage(err)}`);
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  return {
    isApplying,
    isValidating,
    validationErrors,
    stages,
    applyChanges,
    validateDryRun,
  };
}
