import { useState, useEffect } from 'react';
import { Copy, Map, Eye, X } from 'lucide-react';

interface PromptPanelProps {
  onCopy: (promptText: string) => void;
  onCopyMap: (mapText: string) => void;
  files: string[];
  repoMap: string;
}

export function PromptPanel({ onCopy, onCopyMap, files, repoMap }: PromptPanelProps) {
  const [request, setRequest] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  
  // Reset selected files when the repository context changes
  useEffect(() => {
    setSelectedFiles(new Set());
    }, [files]);

  const toggleFile = (file: string) => {
    const newFiles = new Set(selectedFiles);
    if (newFiles.has(file)) {
      newFiles.delete(file);
    } else {
      newFiles.add(file);
    }
    setSelectedFiles(newFiles);
  };

  return (
    <div className="border-r border-zinc-800 flex flex-col h-full p-4 space-y-4 bg-zinc-950/50">
      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-500/10 rounded">
            <Map className="w-4 h-4 text-cyan-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-200">Repo Map Ready</p>
            <p className="text-[10px] text-zinc-500">~{(files.length * 95).toLocaleString()} tokens / {files.length} files parsed</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsMapModalOpen(true)}
            className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 rounded hover:bg-zinc-800"
            title="Preview Repo Map"
          >
            <Eye className="w-4 h-4" />
          </button>
          <span className="text-[10px] text-zinc-500 font-mono italic">updated 2m ago</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col space-y-2 min-h-0">
        <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Context Selection</label>
        <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-md overflow-hidden flex flex-col">
          <div className="p-2 space-y-1 overflow-y-auto custom-scrollbar">
            {files.map((file, i) => {
              const isSelected = selectedFiles.has(file);
              return (
                <label 
                  key={file} 
                  className={`flex items-center p-1.5 rounded text-xs cursor-pointer ${isSelected ? 'bg-zinc-800/50' : 'opacity-60 hover:opacity-100'}`}
                >
                  <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={() => toggleFile(file)}
                    className="mr-2 accent-cyan-500" 
                  />
                  <span className="text-zinc-300">{file}</span>
                  {isSelected && <span className="ml-auto text-[10px] text-zinc-600">4.2kb</span>}
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">User Request</label>
        <textarea 
          className="w-full h-28 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50 resize-none font-sans"
          placeholder="Describe the changes needed..."
          value={request}
          onChange={(e) => setRequest(e.target.value)}
        />
      </div>

      <div className="space-y-2 text-xs text-zinc-300">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" defaultChecked className="accent-cyan-500" />
          <span>Enforce SEARCH/REPLACE blocks</span>
        </label>
      </div>

      <button 
        onClick={async () => {
          setIsCopying(true);
          try {
            const res = await fetch('/api/files', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ files: Array.from(selectedFiles) })
            });
            const data = await res.json();
            
            let activeFilesText = "";
            if (selectedFiles.size > 0) {
              for (const f of selectedFiles) {
                activeFilesText += `--- START OF FILE ${f} ---\n${data.contents[f] || ''}\n--- END OF FILE ${f} ---\n\n`;
              }
            } else {
              activeFilesText = "No specific files selected.";
            }

            const finalPrompt = `ROLE: Senior Software Architect & Elite Developer
You write clean, production-grade, type-safe, and secure code, keeping system architecture and long-term maintainability in mind.

ADVISORY PROTOCOL:
If the user requests a code change that is unoptimized or violates best practices:
1. Fully comply with and implement the exact requested change.
2. At the end of your response, briefly suggest the industry-standard alternative and why it is better, without being preachy or refusing the request.

OUTPUT FORMAT & GUARDRAILS:
You must output code modifications using exact SEARCH/REPLACE blocks.

1. FORMAT RULE: Every modification MUST specify the file path and use this exact delimiter:
   FILE: path/to/file.ext
   <<<<<<< SEARCH
   [exact existing code to replace]
   =======
   [new code]
   >>>>>>> REPLACE

2. THE 80% OVERWRITE RULE (Token Optimization):
   - For partial edits (<80% of file changing): Use targeted SEARCH/REPLACE blocks.
   - For NEW files OR total file rewrites (>80% of file changing): Leave the SEARCH block EMPTY (\`<<<<<<< SEARCH\\n=======\\n[new code]\\n>>>>>>> REPLACE\`) so you do not waste output tokens repeating old code.

3. ANCHOR RULE (Keep SEARCH blocks small):
   - Copy only 2-3 unique lines at the top/bottom of the edit area ("anchors") to keep blocks minimal.

4. EXACT WHITESPACE RULE:
   - Code inside SEARCH MUST match the original file's indentation, spaces, and tabs 100% exactly.

5. SELF-UPDATING KNOWLEDGE BASE (Optional):
   - If a complex bug or architectural rule is resolved during this request, output an additional SEARCH/REPLACE block updating \`ai_context_guide.md\` with the lesson learned under \`<casos_resolvidos_aprendizados>\`.

==================================================
REPO MAP (Project Blueprint):
${repoMap || 'No map generated.'}

==================================================
ACTIVE FILES CONTEXT:
${activeFilesText}
==================================================
USER REQUEST:
${request}`;

            onCopy(finalPrompt);
          } finally {
            setIsCopying(false);
          }
        }}
        disabled={isCopying}
        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-cyan-500/10 flex items-center justify-center space-x-2 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        <Copy className="w-4 h-4" />
        <span>{isCopying ? 'Assembling...' : 'Copy Context + Prompt'}</span>
      </button>

      {isMapModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
              <h2 className="text-sm font-bold text-zinc-200">Repo Map Context Preview (~{(files.length * 95).toLocaleString()} tokens)</h2>
              <button 
                onClick={() => setIsMapModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
              <pre className="font-mono text-xs text-zinc-300 bg-zinc-900 p-4 rounded-lg border border-zinc-800 whitespace-pre-wrap">
                {repoMap || 'Generating Repo Map...'}
              </pre>
            </div>
            
            <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-end space-x-3">
              <button 
                onClick={() => setIsMapModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  onCopyMap(repoMap);
                  setIsMapModalOpen(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-lg shadow-cyan-900/20"
              >
                Copy Raw Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
