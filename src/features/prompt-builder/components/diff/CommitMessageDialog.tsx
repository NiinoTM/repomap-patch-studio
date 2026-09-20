import { useEffect, useState } from "react";
import { GitCommit, Sparkles } from "lucide-react";
import { DiffBlock } from "../../../../types/patch";
import { generateCommitMessage } from "../../utils/commitMessageGenerator";

export interface CommitMessageDialogProps {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  defaultMessage: string;
  diffBlocks: DiffBlock[];
  isApplying: boolean;
  onConfirm: (message: string) => void;
  onCancel: () => void;
}

export function CommitMessageDialog({
  dialogRef,
  defaultMessage,
  diffBlocks,
  isApplying,
  onConfirm,
  onCancel,
}: CommitMessageDialogProps) {
  const [modalMessage, setModalMessage] = useState(defaultMessage);

  useEffect(() => {
    setModalMessage(defaultMessage);
  }, [defaultMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(modalMessage);
  };

  const handleAutoGenerate = () => {
    setModalMessage(generateCommitMessage(diffBlocks));
  };

  return (
    <dialog
      ref={dialogRef}
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-0 backdrop:bg-black/60 m-auto"
      onCancel={onCancel}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            Commit Message
          </h3>
          {diffBlocks.length > 0 && (
            <button
              type="button"
              onClick={handleAutoGenerate}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-mono transition-colors"
              title="Regenerate message from changes"
            >
              <Sparkles className="w-3 h-3" />
              <span>Auto-generate</span>
            </button>
          )}
        </div>
        <input
          type="text"
          autoFocus
          value={modalMessage}
          onChange={(e) => setModalMessage(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="Commit message..."
        />
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!modalMessage.trim() || isApplying}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GitCommit className="w-4 h-4" />
            <span>Commit</span>
          </button>
        </div>
      </form>
    </dialog>
  );
}