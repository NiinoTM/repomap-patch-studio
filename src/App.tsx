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

  useEffect(() => {
    fetch('/api/repo')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRepoPath(data.path);
          setRepoFiles(data.files);
          setRepoMap(data.repoMap);
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
  
  // Mock data for when user clicks paste
  const mockBlocks: DiffBlock[] = [
    {
      id: '1',
      file: 'src/components/Navbar.tsx',
      status: 'match',
      search: '  return (\n    <nav className="bg-white">\n      <Logo />\n    </nav>\n  );',
      replace: '  return (\n    <nav className="bg-white dark:bg-zinc-950 transition-colors">\n      <Logo />\n      <ThemeToggle />\n    </nav>\n  );'
    },
    {
      id: '2',
      file: 'src/theme.ts',
      status: 'no-match',
      search: 'export const theme = {\n  mode: "light"\n};',
      replace: 'export const theme = {\n  mode: "dark",\n  toggle: () => {}\n};'
    }
  ];

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

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setPastedContent(clipboardText);
      const parsed = parseDiffBlocks(clipboardText);
      setDiffBlocks(parsed);
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
          <PromptPanel onCopy={handleCopy} onCopyMap={handleCopyMap} files={repoFiles} repoMap={repoMap} />
        </aside>
        
        <section className="flex-1 flex-shrink-0">
          <DiffPanel 
            pastedContent={pastedContent}
            parsedBlocks={pastedContent ? (diffBlocks.length > 0 ? diffBlocks : mockBlocks) : []} 
            onPaste={handlePaste}
          />
        </section>
      </main>

      <Footer 
        logs={mockLogs} 
        hasChanges={pastedContent.length > 0} 
        diffBlocks={diffBlocks.length > 0 ? diffBlocks : mockBlocks}
      />
      
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
