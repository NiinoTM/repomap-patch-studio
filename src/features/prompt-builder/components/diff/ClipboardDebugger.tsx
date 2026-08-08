interface ClipboardDebuggerProps {
  pastedContent: string;
}

export function ClipboardDebugger({ pastedContent }: ClipboardDebuggerProps) {
  const lines = (pastedContent || "").split(/\r?\n/);

  return (
    <div className="w-full text-left bg-zinc-950 p-4 rounded-lg border border-zinc-800 mt-4 overflow-x-auto font-mono text-[11px] text-zinc-300 shadow-inner">
      <p className="text-[10px] text-zinc-500 uppercase font-bold mb-3 flex items-center justify-between">
        <span>Advanced Line-by-Line Debugger</span>
        <span>{lines.length} lines</span>
      </p>
      <div className="space-y-1 bg-zinc-900 p-3 rounded border border-zinc-800/50">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          let rowColor = "text-zinc-400";
          let badge = null;

          if (trimmed.startsWith("<<<<<<< SEARCH")) {
            rowColor = "text-cyan-400 font-bold bg-cyan-950/30";
            badge = (
              <span className="ml-2 text-[9px] bg-cyan-500/20 text-cyan-300 px-1 rounded uppercase">
                Search Start
              </span>
            );
          } else if (trimmed.startsWith("=======")) {
            rowColor = "text-amber-400 font-bold bg-amber-950/30";
            badge = (
              <span className="ml-2 text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded uppercase">
                Divider
              </span>
            );
          } else if (trimmed.startsWith(">>>>>>> REPLACE")) {
            rowColor = "text-emerald-400 font-bold bg-emerald-950/30";
            badge = (
              <span className="ml-2 text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded uppercase">
                Replace End
              </span>
            );
          }

          return (
            <div
              key={i}
              className={`flex items-start px-1 -mx-1 rounded ${rowColor}`}
            >
              <span className="w-6 shrink-0 text-zinc-600 select-none text-right mr-3 border-r border-zinc-800 pr-2">
                {i + 1}
              </span>
              <span className="whitespace-pre-wrap break-all flex-1">
                {line === "" ? (
                  <span className="text-zinc-600 italic">
                    ↵ (empty line)
                  </span>
                ) : (
                  line
                )}
                {badge}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}