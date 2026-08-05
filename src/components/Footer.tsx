import { useState } from 'react';
import { GitCommit, History, RotateCcw } from 'lucide-react';
import { DiffBlock, HistoryLog } from '../types';

interface FooterProps {
  logs: HistoryLog[];
  hasChanges: boolean;
  diffBlocks?: DiffBlock[];
  onApplySuccess?: () => void;
}

export function Footer({ logs, hasChanges, diffBlocks = [], onApplySuccess }: FooterProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState('ai-edit: updated files');
  const [isApplying, setIsApplying] = useState(false);

  // 1. The Apply Changes Handler (calls /api/apply on your Express backend)
  const handleApplyChanges = async () => {
    if (diffBlocks.length === 0) {
      alert('No diff blocks detected to apply!');
      return;
    }

    setIsApplying(true);
    try {
      const response = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: diffBlocks, commitMessage })
      });
      
      const data = await response.json();
      if (data.success) {
        alert('✅ Edits written to disk & committed to Git!');
        if (onApplySuccess) onApplySuccess();
      } else {
        alert('❌ Error applying edits: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('❌ Failed to connect to local server. Ensure server.js is running!');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <footer className="relative shrink-0 flex flex-col z-10">
      {/* History Drawer */}
      {drawerOpen && (
        <div className="absolute bottom-full left-0 right-0 h-64 bg-zinc-950 border-t border-zinc-800 overflow-y-auto z-0 custom-scrollbar">
          <div className="p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4 sticky top-0 bg-zinc-950 py-1">Recent AI Edits</h3>
            {logs.map((log) => (
              <div key={log.id} className="flex items-start justify-between bg-zinc-900 p-3 rounded-lg border border-zinc-800 group hover:border-zinc-700 transition-colors">
                <div>
                  <div className="flex items-center text-xs text-zinc-400 mb-1">
                    <span className="font-mono mr-3 text-cyan-400/80">{log.id}</span>
                    <span>{log.timestamp}</span>
                  </div>
                  <div className="text-sm text-zinc-200 mb-1">{log.message}</div>
                  <div className="text-xs font-mono text-zinc-500">{log.files.join(', ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Footer Bar */}
      <div className="h-20 border-t border-zinc-800 bg-zinc-950 flex items-center px-6 space-x-6 shrink-0 z-10">
        <div className="flex-1 flex flex-col space-y-1">
          <label className="text-[10px] text-zinc-500 uppercase font-bold">Commit Message</label>
          <input 
            type="text" 
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            disabled={!hasChanges || isApplying}
            className="bg-transparent border-none p-0 text-sm focus:ring-0 focus:outline-none text-zinc-100 placeholder-zinc-700 font-mono disabled:opacity-50" 
            placeholder="Commit message..."
          />
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="flex flex-col items-center justify-center px-4 py-2 hover:bg-zinc-900 rounded-md transition-colors"
          >
            <History className="w-4 h-4 text-zinc-500" />
            <span className="text-[10px] mt-1 text-zinc-500">History ({logs.length})</span>
          </button>
          
          {/* 2. Connected onClick={handleApplyChanges} to the Green Apply Button */}
          <button 
            onClick={handleApplyChanges}
            disabled={!hasChanges || isApplying}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 h-12 rounded-lg font-bold shadow-lg shadow-emerald-500/10 flex items-center space-x-2 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{isApplying ? 'Applying...' : 'Apply Changes & Commit'}</span>
            <GitCommit className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}