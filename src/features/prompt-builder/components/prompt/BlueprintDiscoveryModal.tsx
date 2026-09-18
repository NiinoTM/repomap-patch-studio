import { useState, useEffect } from "react";
import { Compass, CheckSquare, Square, X, ArrowRight, ShieldAlert, Layers } from "lucide-react";
import type { BlueprintDiscoveryPayload } from "../../../../types/remediation";

export interface BlueprintDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  discoveryPayload: BlueprintDiscoveryPayload | null;
  onAcceptCandidates: (acceptedPaths: string[]) => void;
  onBypassDiscovery?: () => void;
}

export function BlueprintDiscoveryModal({
  isOpen,
  onClose,
  discoveryPayload,
  onAcceptCandidates,
  onBypassDiscovery,
}: BlueprintDiscoveryModalProps) {
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (discoveryPayload?.candidates) {
      setSelectedPaths(new Set(discoveryPayload.candidates.map((c) => c.path)));
    }
  }, [discoveryPayload]);

  if (!isOpen) return null;

  const candidates = discoveryPayload?.candidates || [];

  const toggleCandidate = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedPaths(new Set(candidates.map((c) => c.path)));
  };

  const handleDeselectAll = () => {
    setSelectedPaths(new Set());
  };

  const handleAccept = () => {
    onAcceptCandidates(Array.from(selectedPaths));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden font-sans text-xs">
        <header className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-zinc-100 font-mono">
                Architectural Discovery Gate
              </h2>
              <p className="text-xs text-zinc-400">
                Identified relevant seed files to ground your blueprint and prevent hallucinations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {discoveryPayload?.summary && (
            <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-lg p-3 space-y-1">
              <div className="text-cyan-300 font-semibold text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
                <Compass className="w-3.5 h-3.5" />
                <span>Reconnaissance Summary</span>
              </div>
              <p className="text-zinc-300 text-xs leading-relaxed">{discoveryPayload.summary}</p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Discovered Candidate Files ({selectedPaths.size}/{candidates.length})</span>
              </span>
              <div className="space-x-2 text-[11px]">
                <button
                  onClick={handleSelectAll}
                  className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-zinc-600">|</span>
                <button
                  onClick={handleDeselectAll}
                  className="text-zinc-400 hover:text-zinc-300 underline underline-offset-2 cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {candidates.length === 0 ? (
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 text-center text-zinc-500 space-y-2">
                <ShieldAlert className="w-6 h-6 mx-auto text-zinc-600" />
                <p>No specific candidate files identified from the repo map.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/80 border border-zinc-800 rounded-lg bg-zinc-950 max-h-60 overflow-y-auto">
                {candidates.map((cand) => {
                  const isSelected = selectedPaths.has(cand.path);
                  return (
                    <div
                      key={cand.path}
                      onClick={() => toggleCandidate(cand.path)}
                      className="p-2.5 flex items-start space-x-2.5 hover:bg-zinc-900/60 cursor-pointer transition-colors"
                    >
                      <button type="button" className="mt-0.5 text-cyan-400 shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-600" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-cyan-300 font-bold truncate">
                            {cand.path}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-zinc-800 text-zinc-400 rounded uppercase font-mono">
                            {cand.domain}
                          </span>
                        </div>
                        <p className="text-zinc-400 text-[11px] leading-relaxed line-clamp-2">
                          {cand.reason}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <footer className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div>
            {onBypassDiscovery && (
              <button
                onClick={onBypassDiscovery}
                className="text-zinc-400 hover:text-zinc-200 text-xs underline underline-offset-2 cursor-pointer transition-colors"
              >
                Proceed to Blueprint Without Adding Files
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAccept}
              disabled={selectedPaths.size === 0}
              className="px-4 py-1.5 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg transition-all flex items-center space-x-1.5 shadow-lg shadow-cyan-950/30 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Accept & Populate Context ({selectedPaths.size})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}