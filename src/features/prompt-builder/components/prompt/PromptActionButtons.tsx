import { Shield, Layers, Copy, FileText, FlaskConical } from "lucide-react";

import { Flame } from "lucide-react";

interface PromptActionButtonsProps {
  discoveryMode: boolean;
  selectedFilesCount: number;
  isCopying: boolean;
  isCopyingFiles: boolean;
  isCopyingTests: boolean;
  isBlueprintApproved: boolean;
  onCopyFull: () => void;
  onCopyFiles: () => void;
  onCopyTests: () => void;
  onGenerateBlueprint: () => void;
  onOpenBlueprintReview: () => void;
  onConfrontLogic?: () => void;
  hasConfrontation?: boolean;
}

export function PromptActionButtons({
  discoveryMode,
  selectedFilesCount,
  isCopying,
  isCopyingFiles,
  isCopyingTests,
  isBlueprintApproved,
  onCopyFull,
  onCopyFiles,
  onCopyTests,
  onGenerateBlueprint,
  onOpenBlueprintReview,
  onConfrontLogic,
  hasConfrontation,
}: PromptActionButtonsProps) {
  const isAnyCopying = isCopying || isCopyingFiles || isCopyingTests;
  const isDirectPromptUnlocked =
    isBlueprintApproved || discoveryMode || Boolean(hasConfrontation);

  return (
    <div className="space-y-2 shrink-0">
      <div className="flex space-x-2">
        <button
          onClick={onConfrontLogic}
          disabled={isAnyCopying}
          className={`flex-1 font-semibold py-2 rounded-lg flex items-center justify-center space-x-1.5 active:scale-[0.98] transition-all text-[11px] shadow-lg cursor-pointer border ${
            hasConfrontation
              ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
              : "bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600 text-white border-amber-600/30 shadow-amber-900/20"
          }`}
          title="Socratic Gate: Challenge assumptions, failure modes, and routing before blueprinting"
        >
          <Flame className="w-3.5 h-3.5 shrink-0 text-amber-200" />
          <span className="truncate">
            {hasConfrontation ? "Logic Fortified" : "Confront Logic"}
          </span>
        </button>

        <button
          onClick={onGenerateBlueprint}
          disabled={isAnyCopying}
          className="flex-1 bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-2 rounded-lg flex items-center justify-center space-x-1.5 active:scale-[0.98] transition-all text-[11px] shadow-lg shadow-cyan-900/20 cursor-pointer"
          title="Phase 1: Request an architectural blueprint before writing code"
        >
          <Shield className="w-3.5 h-3.5 shrink-0 text-cyan-200" />
          <span className="truncate">Phase 1: Blueprint</span>
        </button>

        <button
          onClick={onOpenBlueprintReview}
          className={`px-3 py-2 rounded-lg font-semibold flex items-center justify-center space-x-1 active:scale-[0.98] transition-all text-[11px] border cursor-pointer ${
            isBlueprintApproved
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
          }`}
          title="Review and validate the AI's architectural blueprint"
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span>{isBlueprintApproved ? "Approved" : "Review"}</span>
        </button>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={onCopyFull}
          disabled={isAnyCopying || !isDirectPromptUnlocked}
          className={`flex-1 font-semibold py-2 rounded-lg shadow-lg flex items-center justify-center space-x-1.5 active:scale-[0.98] transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-[11px] ${
            discoveryMode
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/10"
              : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
          }`}
          title={
            !isDirectPromptUnlocked
              ? "Confront logic or approve blueprint to unlock implementation prompts"
              : ""
          }
        >
          <Copy className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {isCopying
              ? "Assembling..."
              : discoveryMode
                ? "Ask AI What's Needed"
                : `Phase 2: Full Code (${selectedFilesCount})`}
          </span>
        </button>

        <button
          onClick={onCopyFiles}
          disabled={
            isAnyCopying ||
            selectedFilesCount === 0 ||
            discoveryMode ||
            !isDirectPromptUnlocked
          }
          className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold py-2 rounded-lg flex items-center justify-center space-x-1.5 active:scale-[0.98] transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed border border-zinc-800 text-[11px]"
          title={
            !isDirectPromptUnlocked
              ? "Confront logic or approve blueprint to unlock implementation prompts"
              : ""
          }
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {isCopyingFiles ? "Fetching..." : `Files Only (${selectedFilesCount})`}
          </span>
        </button>

        <button
          onClick={onCopyTests}
          disabled={isAnyCopying || selectedFilesCount === 0 || discoveryMode}
          className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 hover:text-emerald-300 font-semibold py-2 rounded-lg flex items-center justify-center space-x-1.5 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer border border-emerald-500/30 hover:border-emerald-500/50 text-[11px]"
          title="Generate Vitest unit tests prompt for selected files"
        >
          <FlaskConical className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
          <span className="truncate">
            {isCopyingTests ? "Generating..." : `Test Prompt (${selectedFilesCount})`}
          </span>
        </button>
      </div>
    </div>
  );
}
