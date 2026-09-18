import { useMemo } from "react";
import { Flame, ShieldAlert, CheckCircle2, X, FileSearch, Plus } from "lucide-react";
import { sanitizeSocraticAnswers } from "../../utils/socraticPrompt";
import { parseFileList } from "../../utils/diffParser";

interface SocraticConfrontationModalProps {
  isOpen: boolean;
  onClose: () => void;
  critiqueText: string;
  onCritiqueChange: (text: string) => void;
  answersText: string;
  onAnswersChange: (text: string) => void;
  onApplyFortified: () => void;
  hasConfrontation: boolean;
  isPersisting?: boolean;
  files?: string[];
  selectedFiles?: Set<string>;
  onAddDiscoveredFiles?: (files: string[]) => void;
}

export function SocraticConfrontationModal({
  isOpen,
  onClose,
  critiqueText,
  onCritiqueChange,
  answersText,
  onAnswersChange,
  onApplyFortified,
  hasConfrontation,
  isPersisting = false,
  files = [],
  selectedFiles,
  onAddDiscoveredFiles,
}: SocraticConfrontationModalProps) {
  if (!isOpen) return null;

  const validation = sanitizeSocraticAnswers(answersText);
  const showWarning = answersText.length > 0 && !validation.isValid;

  const discoveredFiles = useMemo(() => {
    if (!files.length) return [];
    const combined = `${critiqueText}\n${answersText}`;
    const parsed = parseFileList(combined, files);
    if (!selectedFiles) return parsed;
    return parsed.filter((f) => !selectedFiles.has(f));
  }, [critiqueText, answersText, files, selectedFiles]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans text-xs">
        <header className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-sm font-bold text-zinc-100 font-mono flex items-center space-x-2">
                <span>Socratic Logic Interrogation (Adversarial Gate)</span>
                {hasConfrontation && (
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded font-mono">
                    Logic Fortified
                  </span>
                )}
              </h2>
              <p className="text-zinc-400 text-[11px]">
                Stress-test your request against missing routing, failure states, and concurrency voids
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Step 1: Paste AI Adversarial Critique</span>
            </label>
            <textarea
              value={critiqueText}
              onChange={(e) => onCritiqueChange(e.target.value)}
              placeholder="Paste the AI's challenges and suggested options here (e.g. 1. Missing Routing Strategy: Option A vs Option B...)"
              className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-300 font-mono text-[11px] resize-none focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {discoveredFiles.length > 0 && onAddDiscoveredFiles && (
            <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-lg p-2.5 flex items-center justify-between">
              <div className="flex items-center space-x-2 overflow-hidden mr-2">
                <FileSearch className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-cyan-300">
                    Prerequisite Files Identified ({discoveredFiles.length})
                  </p>
                  <p className="text-[10px] text-zinc-400 truncate">
                    {discoveredFiles.join(", ")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onAddDiscoveredFiles(discoveredFiles)}
                className="px-2.5 py-1 text-[10px] font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-md flex items-center space-x-1 shrink-0 transition-colors cursor-pointer shadow-sm shadow-cyan-900/30"
              >
                <Plus className="w-3 h-3" />
                <span>Add to Context</span>
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Step 2: Define Your Chosen Rules & Edge-Case Answers</span>
              </label>
              {showWarning && (
                <span className="text-[10px] text-amber-400 font-mono">
                  ⚠️ {validation.error}
                </span>
              )}
            </div>
            <textarea
              value={answersText}
              onChange={(e) => onAnswersChange(e.target.value)}
              placeholder="Specify the resolutions (minimum 15 characters, e.g. 1. Use Option A skill-matched broadcast. 2. 30-minute timeout before auto-reassigning. 3. Max 3 active jobs per contractor)."
              className={`w-full h-32 bg-zinc-950 border rounded-lg p-3 text-zinc-300 font-mono text-[11px] resize-none focus:outline-none ${
                showWarning
                  ? "border-amber-500/60 focus:border-amber-500"
                  : "border-zinc-800 focus:border-emerald-500/50"
              }`}
            />
          </div>
        </div>

        <footer className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="text-[11px] text-zinc-500">
            Applying appends verified criteria to your request & active ticket
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onApplyFortified}
              disabled={!validation.isValid || isPersisting}
              className="px-4 py-1.5 font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-all shadow-lg shadow-emerald-600/20 cursor-pointer disabled:cursor-not-allowed"
            >
              {isPersisting ? "Persisting to Disk..." : "Fortify Request & Ticket"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}