import { useState } from "react";
import { patchApi } from "../../../api/patchApi";
import { repoApi } from "../../../api/repoApi";

interface UseHeaderActionsParams {
  onUndoSuccess?: () => void;
  onChangeRepo: (newPath: string) => void;
}

/**
 * Owns the two backend calls Header.tsx used to make directly: undoing the
 * last Git edit, and opening the native folder-picker dialog. The component
 * stays presentation-only — no fetch calls buried in its own handlers.
 */
export function useHeaderActions({
  onUndoSuccess,
  onChangeRepo,
}: UseHeaderActionsParams) {
  const [isUndoing, setIsUndoing] = useState(false);

  const handleUndo = async () => {
    if (
      !confirm(
        "Are you sure you want to hard reset to the previous Git commit? Uncommitted changes will be lost.",
      )
    ) {
      return;
    }

    setIsUndoing(true);
    try {
      const data = await patchApi.undo();
      if (data.success) {
        alert("🔄 Git reset successful!");
        onUndoSuccess?.();
      } else {
        alert("❌ Error resetting: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Undo failed:", err);
      alert("❌ Failed to reach backend server. Make sure server is running.");
    } finally {
      setIsUndoing(false);
    }
  };

  const handleChangeRepo = async () => {
    try {
      const data = await repoApi.openFolderDialog();
      if (data.success && data.path) {
        onChangeRepo(data.path);
        return;
      }
      if (!data.success) {
        // Real failure (dialog couldn't launch) — surface the reason.
        alert(
          "❌ Failed to open folder dialog: " + (data.error || "Unknown error"),
        );
      }
      // success && !path means the user cancelled the dialog — no-op, no alert.
    } catch (err) {
      console.error("Failed to open folder dialog:", err);
      alert("Failed to open native folder dialog. Ensure backend is running.");
    }
  };

  return { isUndoing, handleUndo, handleChangeRepo };
}
