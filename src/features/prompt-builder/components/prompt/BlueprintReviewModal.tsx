import { ShieldCheck, Layers, FileCode, X, CheckCircle, AlertCircle } from "lucide-react";
import type { StructuredBlueprint } from "../../../../types/remediation";

interface BlueprintReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  blueprint: StructuredBlueprint | null;
  rawInput: string;
  onRawInputChange: (text: string) => void;
  validationError: string | null;
  onValidate: () => void;
  onApprove: () => void;
  isApproved: boolean;
}

export function BlueprintReviewModal({
  isOpen,
  onClose,
  blueprint,
  rawInput,
  onRawInputChange,
  validationError,
  onValidate,
  onApprove,
  isApproved,
}: BlueprintReviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <header className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-zinc-100 font-mono">
                Architectural Blueprint Review (Phase 1)
              </h2>
              <p className="text-xs text-zinc-400">
                Validate and approve domain boundaries before unlocking implementation code
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

        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
              <span>Paste AI JSON Blueprint</span>
              <button
                onClick={onValidate}
                className="text-[11px] bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-2.5 py-1 rounded cursor-pointer transition-colors"
              >
                Parse & Validate
              </button>
            </label>
            <textarea
              value={rawInput}
              onChange={(e) => onRawInputChange(e.target.value)}
              placeholder='Paste the JSON response from Phase 1 here: { "title": "...", "domains": [...], "targetFiles": [...] }'
              className="w-full h-28 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-300 font-mono text-[11px] resize-none focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {validationError && (
            <div className="bg-rose-950/30 border border-rose-500/30 rounded-lg p-2.5 flex items-start space-x-2 text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="text-[11px] font-mono leading-relaxed">{validationError}</div>
            </div>
          )}

          {blueprint && (
            <div className="space-y-4 border-t border-zinc-800/80 pt-4">
              <div className="bg-zinc-950/70 border border-zinc-800 rounded-lg p-3 space-y-1">
                <div className="font-bold text-zinc-200 text-sm">{blueprint.title}</div>
                <div className="text-zinc-400 text-xs">{blueprint.summary}</div>
              </div>

              <div>
                <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Domain Boundaries ({blueprint.domains.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {blueprint.domains.map((dom) => (
                    <div
                      key={dom.name}
                      className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold font-mono text-cyan-300 text-[11px]">
                          {dom.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded uppercase font-mono">
                          {dom.layer}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2">{dom.description}</p>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        Exports: {dom.publicExports.length} symbols | Private: {dom.privateModules.length} files
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Target Implementation Files ({blueprint.targetFiles.length})</span>
                </h3>
                <div className="border border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-800/80 bg-zinc-950">
                  {blueprint.targetFiles.map((file) => (
                    <div
                      key={file.path}
                      className="p-2 flex items-center justify-between text-[11px]"
                    >
                      <span className="font-mono text-zinc-300 truncate max-w-[60%]">
                        {file.path}
                      </span>
                      <span className="text-zinc-500 text-[10px] truncate">{file.responsibility}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="text-[11px] text-zinc-500">
            {isApproved ? (
              <span className="text-emerald-400 font-medium flex items-center space-x-1">
                <CheckCircle className="w-3.5 h-3.5 inline mr-1" /> Blueprint Approved
              </span>
            ) : (
              "Approval unlocks Phase 2 code implementation prompts"
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={onApprove}
              disabled={!blueprint}
              className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-all shadow-lg shadow-emerald-600/20 cursor-pointer disabled:cursor-not-allowed"
            >
              Approve Architecture
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}