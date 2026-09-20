import { HistoryLog } from "../../../../types/patch";

interface FooterHistoryDrawerProps {
  isOpen: boolean;
  logs: HistoryLog[];
}

export function FooterHistoryDrawer({ isOpen, logs }: FooterHistoryDrawerProps) {
  if (!isOpen) return null;

  return (
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
  );
}