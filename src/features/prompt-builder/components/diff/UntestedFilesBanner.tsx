import { FlaskConical, X, Sparkles } from "lucide-react";

interface UntestedFilesBannerProps {
  untestedFiles: string[];
  onDismiss: () => void;
  onGenerateTests: (files: string[]) => void;
}

export function UntestedFilesBanner({
  untestedFiles,
  onDismiss,
  onGenerateTests,
}: UntestedFilesBannerProps) {
  if (!untestedFiles || untestedFiles.length === 0) return null;

  return (
    <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 shadow-lg shadow-emerald-950/20 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-2.5 min-w-0">
          <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 shrink-0 mt-0.5 border border-emerald-500/20">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-emerald-300">
                Quality Gate: Untested Logic Detected
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-semibold">
                {untestedFiles.length} file{untestedFiles.length > 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Applied patch modified core logic without test coverage:
            </p>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {untestedFiles.map((file) => (
                <span
                  key={file}
                  className="text-[10px] font-mono bg-zinc-900 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800 truncate max-w-[280px]"
                  title={file}
                >
                  {file}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={() => onGenerateTests(untestedFiles)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold rounded-lg flex items-center space-x-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-sm shadow-emerald-900/30"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Tests</span>
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 rounded-lg transition-colors cursor-pointer"
            title="Dismiss test suggestion"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}