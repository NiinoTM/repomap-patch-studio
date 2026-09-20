import { useEffect, useRef, useState } from "react";
import {
  Check,
  GitCommit,
  History,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import { DiffBlock, HistoryLog } from "../../../types/patch";
import { useApplyChanges } from "../hooks/useApplyChanges";
import { generateCommitMessage } from "../utils/commitMessageGenerator";
import { isWarningMessage } from "./diff/ValidationErrorBanner";
import { ApplyWarningDialog } from "./diff/ApplyWarningDialog";
import { FooterHistoryDrawer } from "./diff/FooterHistoryDrawer";
import { CommitMessageDialog } from "./diff/CommitMessageDialog";

interface FooterProps {
  logs: HistoryLog[];
  hasChanges: boolean;
  diffBlocks?: DiffBlock[];
  onApplySuccess?: () => void;
  isClean?: boolean;
}

export function Footer({
  logs,
  hasChanges,
  diffBlocks = [],
  onApplySuccess,
  isClean = true,
}: FooterProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showProgressBanner, setShowProgressBanner] = useState(false);
  const [commitMessage, setCommitMessage] = useState("chore: update repository files");
  const commitDialogRef = useRef<HTMLDialogElement>(null);
  const prevRunningRef = useRef(false);

  useEffect(() => {
    if (diffBlocks.length > 0) {
      const autoMsg = generateCommitMessage(diffBlocks);
      setCommitMessage(autoMsg);
    }
  }, [diffBlocks]);

  const handleAutoGenerate = () => {
    const autoMsg = generateCommitMessage(diffBlocks);
    setCommitMessage(autoMsg);
  };

  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [pendingWarnings, setPendingWarnings] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<"apply" | "commit" | null>(null);

  const {
    isApplying,
    isValidating,
    validationErrors,
    stages,
    applyChanges,
    validateDryRun,
  } = useApplyChanges({ diffBlocks, onApplySuccess });

  useEffect(() => {
    const isRunning = isApplying || isValidating;

    if (isRunning) {
      setShowProgressBanner(true);
      setDrawerOpen(false);
      prevRunningRef.current = true;
      return;
    }

    if (prevRunningRef.current && !isRunning) {
      prevRunningRef.current = false;
      const timer = setTimeout(() => {
        setShowProgressBanner(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isApplying, isValidating]);

  const hasErrors = stages.some((s) => s.status === "error");
  const canCommit = hasChanges || !isClean;

  const handleApplyButtonClick = async () => {
    const hardErrors = validationErrors.filter((e) => !isWarningMessage(e));
    if (hardErrors.length > 0) {
      alert("❌ Cannot apply changes: Breaking errors detected. Please resolve them first.");
      return;
    }

    const activeWarnings = validationErrors.filter(isWarningMessage);
    if (activeWarnings.length > 0) {
      setPendingWarnings(activeWarnings);
      setPendingAction("apply");
      setWarningDialogOpen(true);
      return;
    }

    const res = await validateDryRun();
    if (!res.ok) {
      return;
    }

    if (res.warnings.length > 0) {
      setPendingWarnings(res.warnings);
      setPendingAction("apply");
      setWarningDialogOpen(true);
      return;
    }

    await applyChanges(false, commitMessage);
  };

  const handleCommitButtonClick = async () => {
    const hardErrors = validationErrors.filter((e) => !isWarningMessage(e));
    if (hardErrors.length > 0) {
      alert("❌ Cannot commit: Breaking errors detected. Please resolve them first.");
      return;
    }

    const activeWarnings = validationErrors.filter(isWarningMessage);
    if (activeWarnings.length > 0) {
      setPendingWarnings(activeWarnings);
      setPendingAction("commit");
      setWarningDialogOpen(true);
      return;
    }

    const res = await validateDryRun();
    if (!res.ok) {
      return;
    }

    if (res.warnings.length > 0) {
      setPendingWarnings(res.warnings);
      setPendingAction("commit");
      setWarningDialogOpen(true);
      return;
    }

    commitDialogRef.current?.showModal();
  };

  const handleWarningConfirm = async () => {
    setWarningDialogOpen(false);
    const action = pendingAction;
    setPendingAction(null);

    if (action === "apply") {
      await applyChanges(false, commitMessage, { force: true });
    } else if (action === "commit") {
      commitDialogRef.current?.showModal();
    }
  };

  const handleWarningCancel = () => {
    setWarningDialogOpen(false);
    setPendingAction(null);
  };

  const handleConfirmCommit = async (message: string) => {
    commitDialogRef.current?.close();
    setCommitMessage(message);
    await applyChanges(true, message, { force: true });
  };

  return (
    <footer className="relative shrink-0 flex flex-col z-10">
      <FooterHistoryDrawer isOpen={drawerOpen} logs={logs} />

      {showProgressBanner && stages.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 bg-zinc-950 border-t border-zinc-800 z-0 px-6 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-mono">
            {stages.map((s) => (
              <div key={s.stage} className="flex items-center space-x-1.5">
                {s.status === "done" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : s.status === "error" ? (
                  <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                ) : (
                  <Loader2 className="w-3.5 h-3.5 text-cyan-500 shrink-0 animate-spin" />
                )}
                <span
                  className={
                    s.status === "error" ? "text-rose-400" : "text-zinc-400"
                  }
                >
                  {s.label}
                  {s.durationMs !== undefined && (
                    <span className="text-zinc-600"> ({s.durationMs}ms)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="h-20 border-t border-zinc-800 bg-zinc-950 flex items-center px-6 space-x-6 shrink-0 z-10">
        <div className="flex-1 flex flex-col space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-zinc-500 uppercase font-bold">
              Commit Message
            </label>
            {diffBlocks.length > 0 && (
              <button
                type="button"
                onClick={handleAutoGenerate}
                disabled={isApplying}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-mono transition-colors disabled:opacity-50"
                title="Auto-generate commit message from diff blocks"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-generate</span>
              </button>
            )}
          </div>
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            disabled={!canCommit || isApplying}
            className="bg-transparent border-none p-0 text-sm focus:ring-0 focus:outline-none text-zinc-100 placeholder-zinc-700 font-mono disabled:opacity-50"
            placeholder="Commit message..."
          />
        </div>
        <div className="flex items-center space-x-4">
          {stages.length > 0 && (
            <button
              onClick={() => {
                setShowProgressBanner((prev) => !prev);
                if (!showProgressBanner) setDrawerOpen(false);
              }}
              className="flex flex-col items-center justify-center px-4 py-2 hover:bg-zinc-900 rounded-md transition-colors"
              title="Toggle progress details"
            >
              {isApplying || isValidating ? (
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
              ) : hasErrors ? (
                <XCircle className="w-4 h-4 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              <span className="text-[10px] mt-1 text-zinc-500">Progress</span>
            </button>
          )}

          <button
            onClick={() => {
              setDrawerOpen((prev) => !prev);
              if (!drawerOpen) setShowProgressBanner(false);
            }}
            className="flex flex-col items-center justify-center px-4 py-2 hover:bg-zinc-900 rounded-md transition-colors"
          >
            <History className="w-4 h-4 text-zinc-500" />
            <span className="text-[10px] mt-1 text-zinc-500">
              History ({logs.length})
            </span>
          </button>

          <button
            onClick={handleApplyButtonClick}
            disabled={!hasChanges || isApplying || isValidating}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 h-12 rounded-lg font-bold shadow-lg shadow-blue-500/10 flex items-center space-x-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{isApplying ? "Applying..." : "Apply Changes"}</span>
            <Check className="w-4 h-4" />
          </button>

          <button
            onClick={handleCommitButtonClick}
            disabled={!canCommit || isApplying || isValidating}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 h-12 rounded-lg font-bold shadow-lg shadow-emerald-500/10 flex items-center space-x-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>
              {isValidating
                ? "Validating..."
                : isApplying
                  ? "Committing..."
                  : hasChanges
                    ? "Apply Changes & Commit"
                    : "Commit"}
            </span>
            <GitCommit className="w-4 h-4" />
          </button>
        </div>
      </div>

      <CommitMessageDialog
        dialogRef={commitDialogRef}
        defaultMessage={commitMessage}
        diffBlocks={diffBlocks}
        isApplying={isApplying}
        onConfirm={handleConfirmCommit}
        onCancel={() => commitDialogRef.current?.close()}
      />

      <ApplyWarningDialog
        isOpen={warningDialogOpen}
        warnings={pendingWarnings}
        isCommitting={pendingAction === "commit"}
        isApplying={isApplying}
        onConfirm={handleWarningConfirm}
        onCancel={handleWarningCancel}
      />
    </footer>
  );
}
