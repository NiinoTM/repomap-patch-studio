import { useRef, useState } from "react";
import { Check, GitCommit, History } from "lucide-react";
import { DiffBlock, HistoryLog } from "../../../types/patch";
import { patchApi } from "../../../api/patchApi";

interface FooterProps {
  logs: HistoryLog[];
  hasChanges: boolean;
  diffBlocks?: DiffBlock[];
  onApplySuccess?: () => void;
}

export function Footer({
  logs,
  hasChanges,
  diffBlocks = [],
  onApplySuccess,
}: FooterProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("ai-edit: updated files");
  const [isApplying, setIsApplying] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [modalCommitMessage, setModalCommitMessage] = useState(
    "ai-edit: updated files",
  );
  const commitDialogRef = useRef<HTMLDialogElement>(null);

  const handleApplyChanges = async (
    shouldCommit = true,
    messageOverride?: string,
  ) => {
    if (diffBlocks.length === 0) {
      alert("No diff blocks detected to apply!");
      return;
    }

    const finalCommitMessage = messageOverride ?? commitMessage;

    setIsApplying(true);
    try {
      const data = await patchApi.apply({
        blocks: diffBlocks,
        commitMessage: shouldCommit ? finalCommitMessage : "",
        skipCommit: !shouldCommit,
        commit: shouldCommit,
      });

      if (data.success) {
        alert(
          shouldCommit
            ? "✅ Edits written to disk & committed to Git!"
            : "✅ Edits written to disk!",
        );
        if (onApplySuccess) onApplySuccess();
      } else {
        const errorDetails =
          data.details && Array.isArray(data.details) && data.details.length > 0
            ? `❌ Transaction Aborted (0 files modified on disk):\n\n` +
              data.details.map((d: string) => `• ${d}`).join("\n")
            : `❌ Error applying edits:\n${data.error || "Unknown error"}`;
        alert(errorDetails);
      }
    } catch {
      alert("❌ Failed to connect to local server. Ensure server is running!");
    } finally {
      setIsApplying(false);
    }
  };

  const handleCommitButtonClick = async () => {
    if (diffBlocks.length === 0) {
      alert("No diff blocks detected to apply!");
      return;
    }

    setIsValidating(true);
    try {
      const data = await patchApi.apply({ blocks: diffBlocks, dryRun: true });

      if (data.success) {
        setModalCommitMessage(commitMessage);
        commitDialogRef.current?.showModal();
      } else {
        const errorDetails =
          data.details && Array.isArray(data.details) && data.details.length > 0
            ? `❌ Validation failed (0 files modified on disk):\n\n` +
              data.details.map((d: string) => `• ${d}`).join("\n")
            : `❌ Error validating edits:\n${data.error || "Unknown error"}`;
        alert(errorDetails);
      }
    } catch {
      alert("❌ Failed to connect to local server. Ensure server is running!");
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    commitDialogRef.current?.close();
    setCommitMessage(modalCommitMessage);
    await handleApplyChanges(true, modalCommitMessage);
  };

  return (
    <footer className="relative shrink-0 flex flex-col z-10">
      {drawerOpen && (
        <div className="absolute bottom-full left-0 right-0 h-64 bg-zinc-950 border-t border-zinc-800 overflow-y-auto z-0 custom-scrollbar">
          <div className="p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4 sticky top-0 bg-zinc-950 py-1">
              Recent AI Edits
            </h3>
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between bg-zinc-900 p-3 rounded-lg border border-zinc-800 group hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex items-center text-xs text-zinc-400 mb-1">
                    <span className="font-mono mr-3 text-cyan-400/80">
                      {log.id}
                    </span>
                    <span>{log.timestamp}</span>
                  </div>
                  <div className="text-sm text-zinc-200 mb-1">
                    {log.message}
                  </div>
                  <div className="text-xs font-mono text-zinc-500">
                    {log.files.join(", ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="h-20 border-t border-zinc-800 bg-zinc-950 flex items-center px-6 space-x-6 shrink-0 z-10">
        <div className="flex-1 flex flex-col space-y-1">
          <label className="text-[10px] text-zinc-500 uppercase font-bold">
            Commit Message
          </label>
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            disabled={!hasChanges || isApplying}
            className="bg-transparent border-none p-0 text-sm focus:ring-0 focus:outline-none text-zinc-100 placeholder-zinc-700 font-mono disabled:opacity-50"
            placeholder="Commit message..."
          />
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="flex flex-col items-center justify-center px-4 py-2 hover:bg-zinc-900 rounded-md transition-colors"
          >
            <History className="w-4 h-4 text-zinc-500" />
            <span className="text-[10px] mt-1 text-zinc-500">
              History ({logs.length})
            </span>
          </button>

          <button
            onClick={() => handleApplyChanges(false)}
            disabled={!hasChanges || isApplying}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 h-12 rounded-lg font-bold shadow-lg shadow-blue-500/10 flex items-center space-x-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{isApplying ? "Applying..." : "Apply Changes"}</span>
            <Check className="w-4 h-4" />
          </button>

          <button
            onClick={handleCommitButtonClick}
            disabled={!hasChanges || isApplying || isValidating}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 h-12 rounded-lg font-bold shadow-lg shadow-emerald-500/10 flex items-center space-x-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>
              {isValidating
                ? "Validating..."
                : isApplying
                  ? "Committing..."
                  : "Apply Changes & Commit"}
            </span>
            <GitCommit className="w-4 h-4" />
          </button>
        </div>
      </div>

      <dialog
        ref={commitDialogRef}
        className="bg-zinc-900 border border-zinc-800 rounded-lg p-0 backdrop:bg-black/60 m-auto"
        onCancel={() => commitDialogRef.current?.close()}
      >
        <form
          onSubmit={handleConfirmCommit}
          className="w-full max-w-md p-6 space-y-4"
        >
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            Commit Message
          </h3>
          <input
            type="text"
            autoFocus
            value={modalCommitMessage}
            onChange={(e) => setModalCommitMessage(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Commit message..."
          />
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => commitDialogRef.current?.close()}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!modalCommitMessage.trim() || isApplying}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GitCommit className="w-4 h-4" />
              <span>Commit</span>
            </button>
          </div>
        </form>
      </dialog>
    </footer>
  );
}
