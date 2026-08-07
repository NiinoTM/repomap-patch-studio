import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PromptPanel } from './components/PromptPanel';
import { DiffPanel } from './components/DiffPanel';
import { Footer } from './components/Footer';
import { Toast } from './components/Toast';
import { DiffBlock, HistoryLog } from './types';
import { parseDiffBlocks } from './utils/diffParser';

export default function App() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pastedContent, setPastedContent] = useState('');
  const [diffBlocks, setDiffBlocks] = useState<DiffBlock[]>([]);
  const [repoPath, setRepoPath] = useState<string>('Loading...');
  const [repoFiles, setRepoFiles] = useState<string[]>([]);
  const [repoMap, setRepoMap] = useState<string>('');
  const [fileStats, setFileStats] = useState<Record<string, { size: number; tokens: number }>>({});
  const [dependencyMap, setDependencyMap] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetch('/api/repo')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRepoPath(data.path);
          setRepoFiles(data.files);
          setRepoMap(data.repoMap);
          setFileStats(data.fileStats || {});
          setDependencyMap(data.dependencyMap || {});
        }
      })
      .catch(err => console.error('Failed to fetch repo context:', err));
  }, []);

  const handleChangeRepo = async () => {
    const newPath = prompt('Enter absolute path to your repository:', repoPath);
    if (!newPath || newPath === repoPath) return;

    try {
      const res = await fetch('/api/repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPath })
      });
      const data = await res.json();
      if (data.success) {
        setRepoPath(data.path);
        setRepoFiles(data.files);
        setRepoMap(data.repoMap);
        setToastMessage('Repository context updated successfully!');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Failed to update repository path. Ensure backend is running.');
    }
  };

  const mockLogs: HistoryLog[] = [
    { id: 'c4f2a91', timestamp: '10 mins ago', files: ['src/App.tsx'], message: 'ai-edit: Add routing to App.tsx' },
    { id: '8a1b3c4', timestamp: '1 hour ago', files: ['src/components/Button.tsx'], message: 'ai-edit: fix button padding' },
    { id: 'f2d4e56', timestamp: '2 hours ago', files: ['tailwind.config.js'], message: 'ai-edit: add custom colors' },
    { id: '1e2f3a4', timestamp: 'Yesterday', files: ['package.json'], message: 'ai-edit: install lucide-react' },
  ];

  const handleCopy = async (promptText: string) => {
    await navigator.clipboard.writeText(promptText);
    setToastMessage('Context and Prompt copied to clipboard!');
  };

  const handleCopyMap = async (mapText: string) => {
    await navigator.clipboard.writeText(mapText);
    setToastMessage('Raw Repo Map copied to clipboard!');
  };

  const handleClear = () => {
    setPastedContent('');
    setDiffBlocks([]);
  };

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) return;
      
      setPastedContent(clipboardText);
      const parsed = parseDiffBlocks(clipboardText);
      
      if (parsed.length === 0) {
        setDiffBlocks([]);
        return;
      }

      // Fetch actual file contents to validate the SEARCH blocks
      const uniqueFiles = Array.from(new Set(parsed.map(b => b.file)));
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: uniqueFiles })
      });
      const data = await res.json();
      
      if (data.success) {
        const validatedBlocks = parsed.map(block => {
          // Empty search implies a full file overwrite or new file creation (always valid)
          if (!block.search.trim()) return { ...block, status: 'match' as const };
          
          const content = data.contents[block.file];
          // Check if the exact search string exists in the real file
          const isMatch = content && content.includes(block.search);
          return { ...block, status: isMatch ? 'match' as const : 'no-match' as const };
        });
        setDiffBlocks(validatedBlocks);
      } else {
        setDiffBlocks(parsed);
      }
    } catch (err) {
      console.error('Failed to read clipboard text: ', err);
      setToastMessage('Failed to read clipboard.');
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 overflow-hidden font-sans text-zinc-300 selection:bg-cyan-500/30 antialiased">
      <Header repoPath={repoPath} onChangeRepo={handleChangeRepo} />
      
      <main className="flex-1 flex overflow-hidden">
        <aside className="w-[420px] flex-shrink-0">
          <PromptPanel 
  onCopy={handleCopy} 
  onCopyMap={handleCopyMap} 
  files={repoFiles} 
  repoMap={repoMap} 
  fileStats={fileStats} 
  dependencyMap={dependencyMap} 
/>
        </aside>
        
        <section className="flex-1 flex-shrink-0">
          <DiffPanel 
            pastedContent={pastedContent}
            parsedBlocks={diffBlocks} 
            onPaste={handlePaste}
            onClear={handleClear}
          />
        </section>
      </main>

      <Footer 
        logs={mockLogs} 
        hasChanges={diffBlocks.length > 0} 
        diffBlocks={diffBlocks}
        onApplySuccess={handleClear}
      />
      
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
