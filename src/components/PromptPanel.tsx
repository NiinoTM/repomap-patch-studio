import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Copy, Map, Eye, X, Folder, FolderOpen, FileText, 
  ChevronRight, ChevronDown, CheckSquare, Square, MinusSquare, Search, AtSign
} from 'lucide-react';

interface PromptPanelProps {
  onCopy: (promptText: string) => void;
  onCopyMap: (mapText: string) => void;
  files: string[];
  repoMap: string;
  fileStats?: Record<string, { size: number; tokens: number }>;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  allFiles: string[];
}

interface FuzzyResult {
  filePath: string;
  fileName: string;
  dirPath: string;
  score: number;
  matchedIndices: Set<number>;
}

// ==========================================
// FUZZY MATCHING & SCORING ENGINE
// ==========================================
function fuzzySearchFiles(files: string[], query: string): FuzzyResult[] {
  if (!query) {
    return files.slice(0, 8).map(f => {
      const parts = f.split('/');
      const fileName = parts.pop() || f;
      return {
        filePath: f,
        fileName,
        dirPath: parts.join('/'),
        score: 0,
        matchedIndices: new Set()
      };
    });
  }

  const q = query.toLowerCase();
  const results: FuzzyResult[] = [];

  for (const file of files) {
    const lowerFile = file.toLowerCase();
    let qIdx = 0;
    let score = 0;
    let consecutive = 0;
    const matchedIndices = new Set<number>();

    const parts = file.split('/');
    const fileName = parts.pop() || file;
    const dirPath = parts.join('/');
    const fileNameStartIdx = file.lastIndexOf('/') + 1;

    for (let i = 0; i < file.length; i++) {
      if (qIdx < q.length && lowerFile[i] === q[qIdx]) {
        matchedIndices.add(i);
        qIdx++;
        score += 10;
        consecutive += 1;
        score += consecutive * 5; // Consecutive bonus

        // Bonus if match is inside filename vs directory
        if (i >= fileNameStartIdx) score += 15;

        // Bonus for boundary match (start of word, after /, ., _, -)
        if (i === 0 || i === fileNameStartIdx || " /._-".includes(file[i - 1])) {
          score += 20;
        }
      } else {
        consecutive = 0;
      }
    }

    // Only include if all characters in the query matched in order
    if (qIdx === q.length) {
      results.push({
        filePath: file,
        fileName,
        dirPath,
        score,
        matchedIndices
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 8);
}

export function PromptPanel({ onCopy, onCopyMap, files, repoMap, fileStats }: PromptPanelProps) {
  const [request, setRequest] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));

  // @Mention State
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionPopupRef = useRef<HTMLDivElement>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [activeMentionIndex, setActiveMentionIndex] = useState<number>(0);

  // Perform fuzzy search whenever query changes
  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    return fuzzySearchFiles(files, mentionQuery);
  }, [files, mentionQuery]);

  // ==========================================
  // DYNAMIC @MENTION SYNCHRONIZATION
  // Automatically select/unselect files when @mentions are typed or deleted
  // ==========================================
  const prevMentionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const matches = Array.from(request.matchAll(/@([a-zA-Z0-9_\-./]+)/g));
    const currentMentions = new Set<string>();

    for (const match of matches) {
      const path = match[1];
      if (files.includes(path)) {
        currentMentions.add(path);
      }
    }

    const prevMentions = prevMentionsRef.current;
    const removedMentions = Array.from(prevMentions).filter(f => !currentMentions.has(f));
    const addedMentions = Array.from(currentMentions).filter(f => !prevMentions.has(f));

    if (removedMentions.length > 0 || addedMentions.length > 0) {
      setSelectedFiles(prev => {
        const next = new Set(prev);
        removedMentions.forEach(f => next.delete(f));
        addedMentions.forEach(f => next.add(f));
        return next;
      });
    }

    prevMentionsRef.current = currentMentions;
  }, [request, files]);

  // Click outside listener to close mention popup
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        mentionPopupRef.current && 
        !mentionPopupRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setMentionQuery(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selected files when repo changes
  useEffect(() => {
    setSelectedFiles(new Set());
  }, [files]);

  // Build tree data for Context Selector
  const treeData = useMemo(() => {
    const root: TreeNode = { name: 'root', path: '', isFolder: true, children: [], allFiles: [] };
    const filteredFiles = files.filter(f => f.toLowerCase().includes(searchQuery.toLowerCase()));

    filteredFiles.forEach(filePath => {
      const parts = filePath.split('/');
      let current = root;
      current.allFiles.push(filePath);

      let currentPath = '';
      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        let child = current.children.find(c => c.name === part);
        if (!child) {
          child = {
            name: part,
            path: currentPath,
            isFolder: !isLast,
            children: [],
            allFiles: []
          };
          current.children.push(child);
        }

        if (!isLast) {
          child.allFiles.push(filePath);
        }

        current = child;
      });
    });

    const sortNodes = (node: TreeNode) => {
      node.children.sort((a, b) => {
        if (a.isFolder === b.isFolder) return a.name.localeCompare(b.name);
        return a.isFolder ? -1 : 1;
      });
      node.children.forEach(sortNodes);
    };
    sortNodes(root);

    return root;
  }, [files, searchQuery]);

  // ==========================================
  // TOKEN BUDGET CALCULATION ENGINE
  // ==========================================
  const TARGET_BUDGET = 30000;

  const repoMapTokens = useMemo(() => Math.ceil((repoMap?.length || 0) / 3.8), [repoMap]);

  const selectedFilesTokens = useMemo(() => {
    let total = 0;
    selectedFiles.forEach(file => {
      total += fileStats?.[file]?.tokens || 0;
    });
    return total;
  }, [selectedFiles, fileStats]);

  const promptOverheadTokens = useMemo(() => Math.ceil((request.length + 800) / 3.8), [request]);

  const totalEstimatedTokens = repoMapTokens + selectedFilesTokens + promptOverheadTokens;
  const budgetPercentage = Math.min(100, Math.round((totalEstimatedTokens / TARGET_BUDGET) * 100));

  const budgetStatus = useMemo(() => {
    if (totalEstimatedTokens <= 15000) return { label: 'Optimal Focus', bg: 'bg-emerald-500', text: 'text-emerald-400' };
    if (totalEstimatedTokens <= 30000) return { label: 'Heavy Context', bg: 'bg-amber-500', text: 'text-amber-400' };
    return { label: 'Context Overload', bg: 'bg-rose-500', text: 'text-rose-400' };
  }, [totalEstimatedTokens]);

  // @Mention Handlers
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setRequest(value);

    const textBeforeCursor = value.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_\-./]*)$/);

    if (match) {
      setMentionQuery(match[1]);
      setMentionStartIndex(cursorPos - match[0].length);
      setActiveMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (filePath: string) => {
    if (mentionStartIndex < 0 || !textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const before = request.slice(0, mentionStartIndex);
    const after = request.slice(cursorPos);
    
    const newText = `${before}@${filePath} ${after}`;
    setRequest(newText);

    // Automatically check file in tree selector
    setSelectedFiles(prev => new Set(prev).add(filePath));
    setMentionQuery(null);

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStartIndex + filePath.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && mentionMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveMentionIndex(prev => (prev + 1) % mentionMatches.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveMentionIndex(prev => (prev - 1 + mentionMatches.length) % mentionMatches.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionMatches[activeMentionIndex].filePath);
      } else if (e.key === 'Escape') {
        setMentionQuery(null);
      }
    }
  };

  // Bulk Tree Actions
  const handleSelectAll = () => setSelectedFiles(new Set(files));
  const handleDeselectAll = () => setSelectedFiles(new Set());

  const toggleFolderExpand = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) newExpanded.delete(folderPath);
    else newExpanded.add(folderPath);
    setExpandedFolders(newExpanded);
  };

  const toggleFile = (filePath: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filePath)) newSelected.delete(filePath);
    else newSelected.add(filePath);
    setSelectedFiles(newSelected);
  };

  const toggleFolderSelection = (node: TreeNode) => {
    const newSelected = new Set(selectedFiles);
    const folderFiles = node.allFiles;
    const allSelected = folderFiles.every(f => newSelected.has(f));

    if (allSelected) {
      folderFiles.forEach(f => newSelected.delete(f));
    } else {
      folderFiles.forEach(f => newSelected.add(f));
    }
    setSelectedFiles(newSelected);
  };

  const renderTreeNode = (node: TreeNode, depth = 0) => {
    if (node.isFolder) {
      const isExpanded = expandedFolders.has(node.path) || searchQuery.trim().length > 0;
      const folderFiles = node.allFiles;
      const selectedCount = folderFiles.filter(f => selectedFiles.has(f)).length;
      const allSelected = folderFiles.length > 0 && selectedCount === folderFiles.length;
      const someSelected = selectedCount > 0 && selectedCount < folderFiles.length;

      return (
        <div key={node.path || node.name} className="select-none">
          <div 
            className="flex items-center py-1 px-1 rounded hover:bg-zinc-800/60 cursor-pointer text-xs text-zinc-300"
            style={{ paddingLeft: `${depth * 12 + 4}px` }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderSelection(node);
              }}
              className="mr-1.5 text-zinc-400 hover:text-cyan-400 transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="w-3.5 h-3.5 text-cyan-500 fill-cyan-500/20" />
              ) : someSelected ? (
                <MinusSquare className="w-3.5 h-3.5 text-cyan-500" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>

            <div 
              onClick={() => toggleFolderExpand(node.path)}
              className="flex items-center flex-1 min-w-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500 mr-1 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500 mr-1 shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-cyan-500/80 mr-1.5 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-zinc-400 mr-1.5 shrink-0" />
              )}
              <span className="font-medium text-zinc-200 truncate">{node.name}</span>
              <span className="ml-auto text-[10px] text-zinc-600 pl-2">
                {selectedCount}/{folderFiles.length}
              </span>
            </div>
          </div>

          {isExpanded && (
            <div>
              {node.children.map(child => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const isSelected = selectedFiles.has(node.path);
    return (
      <div 
        key={node.path}
        onClick={() => toggleFile(node.path)}
        className={`flex items-center py-1 px-1 rounded text-xs cursor-pointer select-none transition-colors ${
          isSelected ? 'bg-zinc-800/70 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200'
        }`}
        style={{ paddingLeft: `${depth * 12 + 20}px` }}
      >
        <button className="mr-1.5 text-zinc-400 hover:text-cyan-400">
          {isSelected ? (
            <CheckSquare className="w-3.5 h-3.5 text-cyan-500 fill-cyan-500/20" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
        </button>
        <FileText className="w-3.5 h-3.5 text-zinc-500 mr-1.5 shrink-0" />
        <span className="truncate">{node.name}</span>
      </div>
    );
  };

  // Helper to render fuzzy character highlighting
  const renderFuzzyPath = (result: FuzzyResult) => {
    const chars = result.filePath.split('');
    return (
      <span className="font-mono text-xs truncate">
        {chars.map((char, idx) => {
          const isMatched = result.matchedIndices.has(idx);
          return (
            <span 
              key={idx} 
              className={isMatched ? 'text-cyan-400 font-bold bg-cyan-950/60 rounded-[1px]' : 'text-zinc-400'}
            >
              {char}
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <div className="border-r border-zinc-800 flex flex-col h-full p-4 space-y-4 bg-zinc-950/50">
      {/* Repo Map Status Header */}
      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-500/10 rounded">
            <Map className="w-4 h-4 text-cyan-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-200">Repo Map Ready</p>
            <p className="text-[10px] text-zinc-500">~{repoMapTokens.toLocaleString()} map tokens / {files.length} files</p>
          </div>
        </div>
        <button 
          onClick={() => setIsMapModalOpen(true)}
          className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 rounded hover:bg-zinc-800"
          title="Preview Repo Map"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>

      {/* LIVE TOKEN BUDGET BAR */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${budgetStatus.bg} animate-pulse`} />
            <span className="text-xs font-semibold text-zinc-200">Token Budget</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-800 ${budgetStatus.text}`}>
              {budgetStatus.label}
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-zinc-100">
            {totalEstimatedTokens.toLocaleString()}{' '}
            <span className="text-[10px] font-normal text-zinc-500">/ 30k</span>
          </span>
        </div>

        <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden flex">
          <div 
            className={`h-full transition-all duration-300 ${budgetStatus.bg}`}
            style={{ width: `${budgetPercentage}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] text-zinc-500 font-mono pt-0.5">
          <span>Map: {repoMapTokens.toLocaleString()} tks</span>
          <span>Files ({selectedFiles.size}): {selectedFilesTokens.toLocaleString()} tks</span>
        </div>
      </div>

      {/* Context Selection Tree */}
      <div className="flex-1 flex flex-col space-y-2 min-h-0">
        <div className="flex items-center justify-between">
          <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
            Context Selection ({selectedFiles.size}/{files.length})
          </label>
          <div className="flex items-center space-x-2 text-[10px]">
            <button onClick={handleSelectAll} className="text-cyan-500 hover:text-cyan-400 font-medium hover:underline cursor-pointer">
              Select All
            </button>
            <span className="text-zinc-700">|</span>
            <button onClick={handleDeselectAll} className="text-zinc-500 hover:text-zinc-400 font-medium hover:underline cursor-pointer">
              Clear
            </button>
          </div>
        </div>

        {/* Filter input */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter files or folders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-md pl-8 pr-3 py-1 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 text-zinc-500 hover:text-zinc-300">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Tree view */}
        <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-md overflow-hidden flex flex-col">
          <div className="p-2 space-y-0.5 overflow-y-auto custom-scrollbar flex-1">
            {treeData.children.length > 0 ? (
              treeData.children.map(child => renderTreeNode(child))
            ) : (
              <div className="text-center py-6 text-xs text-zinc-600">No files found</div>
            )}
          </div>
        </div>
      </div>

      {/* USER REQUEST TEXTAREA WITH FUZZY @MENTION POPUP */}
      <div className="space-y-2 relative">
        <div className="flex items-center justify-between">
          <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold flex items-center">
            <span>User Request</span>
            <span className="ml-2 text-[10px] text-cyan-500/80 normal-case font-normal flex items-center">
              <AtSign className="w-3 h-3 inline mr-0.5" /> Type @ to link files
            </span>
          </label>
        </div>

        {/* FLOATING FUZZY @MENTION AUTOCOMPLETE POPUP */}
        {mentionQuery !== null && mentionMatches.length > 0 && (
          <div 
            ref={mentionPopupRef}
            className="absolute bottom-full mb-1 left-0 right-0 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 overflow-hidden max-h-52 overflow-y-auto custom-scrollbar"
          >
            <div className="p-1.5 bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 font-medium flex justify-between">
              <span>Fuzzy Matches for "@{mentionQuery}"</span>
              <span className="text-zinc-600">↑↓ to navigate, Enter to select</span>
            </div>
            {mentionMatches.map((res, idx) => (
              <div
                key={res.filePath}
                onClick={() => insertMention(res.filePath)}
                onMouseEnter={() => setActiveMentionIndex(idx)}
                className={`px-3 py-1.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                  idx === activeMentionIndex 
                    ? 'bg-cyan-600/30 text-cyan-200 border-l-2 border-cyan-500' 
                    : 'text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center min-w-0 mr-2">
                  <FileText className="w-3.5 h-3.5 mr-2 text-zinc-400 shrink-0" />
                  {renderFuzzyPath(res)}
                </div>
                {selectedFiles.has(res.filePath) && (
                  <span className="text-[9px] bg-cyan-500/20 text-cyan-400 font-mono px-1 py-0.5 rounded border border-cyan-500/30 shrink-0">
                    Added
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <textarea 
          ref={textareaRef}
          className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50 resize-none font-sans"
          placeholder="Describe the changes needed... (type @ to fuzzy match files)"
          value={request}
          onChange={handleTextareaChange}
          onKeyDown={handleTextareaKeyDown}
        />
      </div>

      <div className="space-y-2 text-xs text-zinc-300">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" defaultChecked className="accent-cyan-500" />
          <span>Enforce SEARCH/REPLACE blocks</span>
        </label>
      </div>

      {/* Copy Context Button */}
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
        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-cyan-500/10 flex items-center justify-center space-x-2 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
      >
        <Copy className="w-4 h-4" />
        <span>{isCopying ? 'Assembling...' : `Copy Context (${selectedFiles.size} Files) + Prompt`}</span>
      </button>

      {/* Repo Map Modal */}
      {isMapModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
              <h2 className="text-sm font-bold text-zinc-200">Repo Map Context Preview (~{repoMapTokens.toLocaleString()} tokens)</h2>
              <button onClick={() => setIsMapModalOpen(false)} className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
              <pre className="font-mono text-xs text-zinc-300 bg-zinc-900 p-4 rounded-lg border border-zinc-800 whitespace-pre-wrap">
                {repoMap || 'Generating Repo Map...'}
              </pre>
            </div>
            
            <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-end space-x-3">
              <button onClick={() => setIsMapModalOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700 cursor-pointer">
                Close
              </button>
              <button 
                onClick={() => {
                  onCopyMap(repoMap);
                  setIsMapModalOpen(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-lg shadow-cyan-900/20 cursor-pointer"
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