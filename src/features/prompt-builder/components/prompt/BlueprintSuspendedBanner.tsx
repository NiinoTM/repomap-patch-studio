import { useState } from "react";
import { Play, PauseCircle, Trash2, AlertCircle } from "lucide-react";

export interface BlueprintSuspendedBannerProps {
  currentStepIndex: number;
  totalSteps: number;
  progressPercent: number;
  isBatchMode?: boolean;
  onResume: () => void;
  onDiscard: () => void;
}

export function BlueprintSuspendedBanner({
  currentStepIndex,
  totalSteps,
  progressPercent,
  isBatchMode = false,
  onResume,
  onDiscard,
}: BlueprintSuspendedBannerProps) {
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  return (
    <div
      role="region"
      aria-label="Paused Blueprint Progress"
      className="bg-zinc-950/90 border border-cyan-500/40 rounded-xl px-3 py-2 flex items-center justify-between shadow-lg shadow-cyan-950/20 font-sans text-xs shrink-0"
    >
      <div className="flex items-center space-x-2 min-w-0">
        <PauseCircle className="w-4 h-4 text-cyan-400 shrink-0" />
        <div className="flex items-center space-x-1.5 truncate">
          <span className="font-bold text-zinc-200 font-mono">
            Blueprint Paused
          </span>
          <span className="text-[11px] text-zinc-400 font-mono">
            ({isBatchMode ? "Batch" : "Step"} {currentStepIndex + 1} of {totalSteps} • {progressPercent}%)
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {confirmingDiscard ? (
          <div className="flex items-center space-x-1.5 bg-zinc-900 border border-zinc-700 px-2 py-1 rounded">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-zinc-300 text-[11px]">Discard plan?</span>
            <button
              type="button"
              onClick={onDiscard}
              className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-semibold rounded cursor-pointer transition-colors"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDiscard(false)}
              className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] rounded cursor-pointer transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={onResume}
              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded flex items-center space-x-1 cursor-pointer transition-colors text-[11px] shadow-sm"
              title="Resume blueprint execution"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Resume</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmingDiscard(true)}
              className="px-2 py-1 bg-zinc-900 hover:bg-red-950/40 hover:text-red-300 text-zinc-400 text-[11px] rounded border border-zinc-800 hover:border-red-800/50 flex items-center space-x-1 cursor-pointer transition-colors"
              title="Permanently discard active blueprint plan"
            >
              <Trash2 className="w-3 h-3" />
              <span>Discard</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}