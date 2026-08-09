import { useState } from "react";
import { Header } from "./features/prompt-builder/components/Header";
import { PromptPanel } from "./features/prompt-builder/components/PromptPanel";
import { DiffPanel } from "./features/prompt-builder/components/DiffPanel";
import { Footer } from "./features/prompt-builder/components/Footer";
import { Toast } from "./features/prompt-builder/components/Toast";
import { DiffBlock } from "./types/patch";
import { useRepoContext } from "./features/prompt-builder/hooks/useRepoContext";
import { usePasteAndValidate } from "./features/prompt-builder/hooks/usePasteAndValidate";

export default function App() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pastedContent, setPastedContent] = useState("");
  const [diffBlocks, setDiffBlocks] = useState<DiffBlock[]>([]);
  const [ignoredBlockIds, setIgnoredBlockIds] = useState<Set<string>>(
    new Set(),
  );
  const [tokenStats, setTokenStats] = useState({
    total: 0,
    map: 0,
    files: 0,
    selectedCount: 0,
  });
  const [discoveryMode, setDiscoveryMode] = useState(false);
  const [discoveredFiles, setDiscoveredFiles] = useState<string[]>([]);

  const {
    repoPath,
    repoFiles,
    repoMap,
    fileStats,
    dependencyMap,
    logs,
    changeRepo,
    refreshHistory,
  } = useRepoContext();

  const { handlePaste } = usePasteAndValidate({
    pastedContent,
    setPastedContent,
    setDiffBlocks,
    setIgnoredBlockIds,
    setToastMessage,
    discoveryMode,
    setDiscoveryMode,
    setDiscoveredFiles,
  });

  const handleChangeRepo = async (newPath: string) => {
    const success = await changeRepo(newPath);
    if (success) {
      setToastMessage("Repository context updated successfully!");
    }
  };

  const handleCopy = async (promptText: string) => {
    await navigator.clipboard.writeText(promptText);
    setToastMessage("Context and Prompt copied to clipboard!");
  };

  const handleCopyMap = async (mapText: string) => {
    await navigator.clipboard.writeText(mapText);
    setToastMessage("Raw Repo Map copied to clipboard!");
  };

  const handleClear = () => {
    setPastedContent("");
    setDiffBlocks([]);
    setIgnoredBlockIds(new Set());
  };

  const handleToggleBlockIgnore = (id: string) => {
    setIgnoredBlockIds((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleApplySuccess = () => {
    handleClear();
    refreshHistory();
  };

  const activeDiffBlocks = (diffBlocks || []).filter(
    (b) => !ignoredBlockIds?.has?.(b.id),
  );

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 overflow-hidden font-sans text-zinc-300 selection:bg-cyan-500/30 antialiased">
      <Header
        repoPath={repoPath}
        onChangeRepo={handleChangeRepo}
        onUndoSuccess={refreshHistory}
        tokenStats={tokenStats}
      />

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-[420px] flex-shrink-0">
          <PromptPanel
            onCopy={handleCopy}
            onCopyMap={handleCopyMap}
            files={repoFiles}
            repoMap={repoMap}
            fileStats={fileStats}
            dependencyMap={dependencyMap}
            onTokenStatsChange={setTokenStats}
            discoveryMode={discoveryMode}
            onDiscoveryModeChange={setDiscoveryMode}
            discoveredFiles={discoveredFiles}
            onDiscoveredFilesConsumed={() => setDiscoveredFiles([])}
          />
        </aside>

        <section className="flex-1 min-w-0 overflow-hidden">
          <DiffPanel
            pastedContent={pastedContent}
            parsedBlocks={diffBlocks}
            ignoredBlocks={ignoredBlockIds}
            onToggleBlock={handleToggleBlockIgnore}
            onPaste={handlePaste}
            onClear={handleClear}
            onBlockEdit={(id, search, replace) => {
              setDiffBlocks((prev) =>
                prev.map((b) => (b.id === id ? { ...b, search, replace } : b)),
              );
            }}
          />
        </section>
      </main>

      <Footer
        logs={logs}
        hasChanges={activeDiffBlocks.length > 0}
        diffBlocks={activeDiffBlocks}
        onApplySuccess={handleApplySuccess}
      />

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
