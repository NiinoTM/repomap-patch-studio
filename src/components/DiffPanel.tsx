import { useState } from 'react';
import { ClipboardPaste, AlertTriangle, Bug } from 'lucide-react';
import { DiffBlock } from '../types';

interface DiffPanelProps {
  parsedBlocks: DiffBlock[];
  onPaste: () => void;
  onClear: () => void;
  pastedContent: string;
}

export function DiffPanel({ parsedBlocks, onPaste, onClear, pastedContent }: DiffPanelProps) {
  const [ignoredBlocks, setIgnoredBlocks] = useState<Set<string>>(new Set());
  const [showDebug, setShowDebug] = useState(false);

  const toggleBlock = (id: string) => {
    const newIgnored = new Set(ignoredBlocks);
    if (newIgnored.has(id)) {
      newIgnored.delete(id);
    } else {
      newIgnored.add(id);
    }
    setIgnoredBlocks(newIgnored);
  };

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-zinc-950 p-4 space-y-4 overflow-hidden">
      <div className="flex items-center justify-between bg-zinc-900 p-2 rounded-lg border border-zinc-800">
        <div className="flex items-center space-x-3">
          {parsedBlocks.length > 0 && (
            <div className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded text-[10px] font-bold">
              {parsedBlocks.length} BLOCKS DETECTED
            </div>
          )}
          <span className="text-xs text-zinc-400">Paste AI response below to review diffs</span>
        </div>
        {pastedContent && (
          <button 
            onClick={onClear}
            className="text-xs bg-zinc-800 px-3 py-1 rounded text-zinc-200 hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
        {!pastedContent ? (
          <div 
            onClick={onPaste}
            className="flex-1 border-2 border-dashed border-zinc-800 rounded-xl flex items-center justify-center cursor-pointer hover:bg-zinc-900/30 transition-colors group"
          >
            <div className="flex flex-col items-center text-zinc-600 group-hover:text-zinc-500 transition-colors">
              <ClipboardPaste className="w-8 h-8 mb-2" />
              <span className="text-xs uppercase font-bold tracking-widest">Click to paste response</span>
            </div>
          </div>
        ) : parsedBlocks.length === 0 ? (
          /* FALLBACK WARNING & CLIPBOARD DEBUGGER */
          <div className="flex-1 border border-amber-500/30 bg-amber-950/20 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3 overflow-y-auto custom-scrollbar">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
            <p className="text-sm font-semibold text-zinc-200">No Diff Blocks Detected</p>
            <p className="text-xs text-zinc-400 max-w-md">
              The pasted clipboard text does not contain valid <code className="text-cyan-400">&lt;&lt;&lt;&lt;&lt;&lt;&lt; SEARCH</code> or <code className="text-cyan-400">Create 'file'</code> blocks.
            </p>
            <div className="flex items-center space-x-3 pt-2">
              <button 
                onClick={onClear}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg transition-colors cursor-pointer"
              >
                Clear
              </button>
              <button 
                onClick={() => setShowDebug(!showDebug)}
                className="px-4 py-2 bg-zinc-800/80 hover:bg-zinc-700/80 text-cyan-400 text-xs rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
              >
                <Bug className="w-3.5 h-3.5 mr-1" />
                <span>{showDebug ? 'Hide Clipboard Text' : 'Debug Clipboard Text'}</span>
              </button>
            </div>

            {showDebug && (
              <div className="w-full text-left bg-zinc-950 p-4 rounded-lg border border-zinc-800 mt-4 overflow-x-auto font-mono text-[11px] text-zinc-300 shadow-inner">
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-3 flex items-center justify-between">
                  <span>Advanced Line-by-Line Debugger</span>
                  <span>{pastedContent.split(/\r?\n/).length} lines</span>
                </p>
                <div className="space-y-1 bg-zinc-900 p-3 rounded border border-zinc-800/50">
                  {pastedContent.split(/\r?\n/).map((line, i) => {
                    const trimmed = line.trim();
                    let rowColor = 'text-zinc-400';
                    let badge = null;

                    if (trimmed.startsWith('<<<<<<< SEARCH')) {
                      rowColor = 'text-cyan-400 font-bold bg-cyan-950/30';
                      badge = <span className="ml-2 text-[9px] bg-cyan-500/20 text-cyan-300 px-1 rounded uppercase">Search Start</span>;
                    } else if (trimmed.startsWith('=======')) {
                      rowColor = 'text-amber-400 font-bold bg-amber-950/30';
                      badge = <span className="ml-2 text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded uppercase">Divider</span>;
                    } else if (trimmed.startsWith('>>>>>>> REPLACE')) {
                      rowColor = 'text-emerald-400 font-bold bg-emerald-950/30';
                      badge = <span className="ml-2 text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded uppercase">Replace End</span>;
                    }

                    return (
                      <div key={i} className={`flex items-start px-1 -mx-1 rounded ${rowColor}`}>
                        <span className="w-6 shrink-0 text-zinc-600 select-none text-right mr-3 border-r border-zinc-800 pr-2">
                          {i + 1}
                        </span>
                        <span className="whitespace-pre-wrap break-all flex-1">
                          {line === '' ? <span className="text-zinc-600 italic">↵ (empty line)</span> : line}
                          {badge}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
              {parsedBlocks.map((block) => {
                const isIgnored = ignoredBlocks.has(block.id);
                return (
                  <div key={block.id} className={`bg-zinc-900/30 border border-zinc-800 rounded-xl flex flex-col overflow-hidden transition-opacity ${isIgnored ? 'opacity-50 grayscale' : ''}`}>
                    <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono text-zinc-300">{block.file}</span>
                        {block.status === 'match' ? (
                          <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold uppercase">
                            Match Found
                          </span>
                        ) : (
                          <span className="bg-rose-500/20 text-rose-400 text-[10px] px-1.5 py-0.5 rounded border border-rose-500/20 font-bold uppercase">
                            Not Found
                          </span>
                        )}
                      </div>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <span className={`text-[10px] font-bold uppercase ${!isIgnored ? 'text-cyan-500' : 'text-zinc-500'}`}>
                          {isIgnored ? 'Ignored' : 'Accepted'}
                        </span>
                        <div className={`w-8 h-4 rounded-full flex items-center transition-colors p-0.5 ${!isIgnored ? 'bg-cyan-500' : 'bg-zinc-700'}`}>
                          <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${!isIgnored ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={!isIgnored} 
                          onChange={() => toggleBlock(block.id)} 
                        />
                      </label>
                    </div>
                    
                    <div className="p-4 font-mono text-[11px] overflow-x-auto custom-scrollbar leading-relaxed min-w-0 w-full">
                      <div className="text-rose-500 opacity-50 select-none">{"<<<<<<< SEARCH"}</div>
                      <div className="pl-4 text-zinc-500 whitespace-pre">
                        {block.search}
                      </div>
                      <div className="text-emerald-500 opacity-50 select-none">{"======="}</div>
                      <div className="pl-4 text-zinc-200 whitespace-pre">
                        {block.replace}
                      </div>
                      <div className="text-emerald-500 opacity-50 select-none">{">>>>>>> REPLACE"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div 
              onClick={onPaste}
              className="h-20 shrink-0 border-2 border-dashed border-zinc-800 rounded-xl flex items-center justify-center cursor-pointer hover:bg-zinc-900/30 transition-colors"
            >
              <div className="flex flex-col items-center text-zinc-600">
                <ClipboardPaste className="w-5 h-5 mb-1" />
                <span className="text-[10px] uppercase font-bold tracking-widest">Paste additional block</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}