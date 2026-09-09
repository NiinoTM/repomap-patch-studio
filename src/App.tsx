import { useState } from "react";
import { Header } from "./features/prompt-builder/components/Header";
import { PromptPanel } from "./features/prompt-builder/components/PromptPanel";
import { DiffPanel } from "./features/prompt-builder/components/DiffPanel";
import { Footer } from "./features/prompt-builder/components/Footer";
import { Toast } from "./features/prompt-builder/components/Toast";
import { DiffBlock } from "./types/patch";
import { Ticket } from "./types/ticket";
import { useRepoContext } from "./features/prompt-builder/hooks/useRepoContext";
import { usePasteAndValidate } from "./features/prompt-builder/hooks/usePasteAndValidate";
import { findUntestedFiles } from "./features/prompt-builder/utils/testDetection";
import { filterRepoMapByScope } from "./features/prompt-builder/utils/scopeFilter";
import { filesApi } from "./api/repoApi";
import {
  formatActiveFilesContext,
  buildUnitTestPrompt,
} from "./features/prompt-builder/utils/promptTemplates";

export default function App() {
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
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
  const [untestedFiles, setUntestedFiles] = useState<string[]>([]);
  const [activeScope, setActiveScope] = useState<string>("all");

  const {
    repoPath,
    repoFiles,
    repoMap,
    fileStats,
    dependencyMap,
    isClean,
    logs,
    changeRepo,
    refreshHistory,
    refreshRepo,
  } = useRepoContext();

  const handleRefreshAll = () => {
    refreshHistory();
    refreshRepo();
  };

  const { handlePaste } = usePasteAndValidate({
    pastedContent,
    setPastedContent,
    setDiffBlocks,
    setIgnoredBlockIds,
    setToastMessage,
    discoveryMode,
    setDiscoveryMode,
    setDiscoveredFiles,
    repoFiles,
  });

  const handleChangeRepo = async (newPath: string) => {
    const success = await changeRepo(newPath);
    if (success) {
      setToastMessage("Repository context updated successfully!");
    }
  };

  const handleCopy = async (promptText: string) => {
    try {
      await navigator.clipboard.writeText(promptText);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = promptText;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
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

  const handleApplySuccess = (appliedFiles?: string[]) => {
    const files =
      appliedFiles && appliedFiles.length > 0
        ? appliedFiles
        : activeDiffBlocks.map((b) => b.matchedFile || b.file).filter(Boolean);

    const untested = findUntestedFiles(files, repoFiles);
    setUntestedFiles(untested);

    handleClear();
    handleRefreshAll();
  };

  const handleGenerateTestsForUntested = async (filesToTest: string[]) => {
    try {
      setDiscoveredFiles(filesToTest);
      setUntestedFiles([]);
      const data = await filesApi.fetchFiles(filesToTest);
      const activeFilesText = formatActiveFilesContext(
        filesToTest,
        data.contents || {},
      );
      const prompt = buildUnitTestPrompt({ activeFilesText });
      await navigator.clipboard.writeText(prompt);
      setToastMessage(
        `🧪 Unit test prompt copied to clipboard for ${filesToTest.length} file(s)!`,
      );
    } catch {
      setDiscoveredFiles(filesToTest);
      setUntestedFiles([]);
      setToastMessage(
        `Selected ${filesToTest.length} untested file(s) in Prompt Builder.`,
      );
    }
  };

  const activeDiffBlocks = (diffBlocks || []).filter(
    (b) => !ignoredBlockIds?.has?.(b.id),
  );

  const scopedRepoMap = filterRepoMapByScope(repoMap, activeScope);

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 overflow-hidden font-sans text-zinc-300 selection:bg-cyan-500/30 antialiased">
      <Header
        repoPath={repoPath}
        repoFiles={repoFiles}
        onChangeRepo={handleChangeRepo}
        onUndoSuccess={handleRefreshAll}
        tokenStats={tokenStats}
        activeTicket={activeTicket}
        onActiveTicketChange={setActiveTicket}
        activeScope={activeScope}
        onActiveScopeChange={setActiveScope}
      />

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-[420px] flex-shrink-0">
          <PromptPanel
            onCopy={handleCopy}
            onCopyMap={handleCopyMap}
            files={repoFiles}
            repoMap={scopedRepoMap}
            fileStats={fileStats}
            dependencyMap={dependencyMap}
            onTokenStatsChange={setTokenStats}
            discoveryMode={discoveryMode}
            onDiscoveryModeChange={setDiscoveryMode}
            discoveredFiles={discoveredFiles}
            onDiscoveredFilesConsumed={() => setDiscoveredFiles([])}
            activeTicket={activeTicket}
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
            untestedFiles={untestedFiles}
            onDismissUntested={() => setUntestedFiles([])}
            onGenerateTestsForUntested={handleGenerateTestsForUntested}
          />
        </section>
      </main>

      <Footer
        logs={logs}
        hasChanges={activeDiffBlocks.length > 0}
        diffBlocks={activeDiffBlocks}
        onApplySuccess={handleApplySuccess}
        isClean={isClean}
      />

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
