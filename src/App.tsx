import { useState } from "react";
import { Header } from "./features/prompt-builder/components/Header";
import { PromptPanel } from "./features/prompt-builder/components/PromptPanel";
import { DiffPanel } from "./features/prompt-builder/components/DiffPanel";
import { Footer } from "./features/prompt-builder/components/Footer";
import { Toast } from "./features/prompt-builder/components/Toast";
import { DiffBlock } from "./types";
import { parseDiffBlocks } from "./features/prompt-builder/utils/diffParser";
import { filesApi } from "./api/client";
import { useRepoContext } from "./features/prompt-builder/hooks/useRepoContext";

export default function App() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pastedContent, setPastedContent] = useState("");
  const [diffBlocks, setDiffBlocks] = useState<DiffBlock[]>([]);
  const [tokenStats, setTokenStats] = useState({
    total: 0,
    map: 0,
    files: 0,
    selectedCount: 0,
  });

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
  };

  const handleApplySuccess = () => {
    handleClear();
    refreshHistory();
  };

  const handlePaste = async (append = false) => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText) return;

      const newContent =
        append && pastedContent
          ? pastedContent + "\n\n" + clipboardText
          : clipboardText;
      setPastedContent(newContent);
      const parsed = parseDiffBlocks(newContent);

      if (parsed.length === 0) {
        setDiffBlocks([]);
        return;
      }

      const uniqueFiles = Array.from(
        new Set(parsed.map((b) => b.file).filter((f) => f !== "Active File")),
      );

      let data = { success: false, contents: {} as Record<string, string> };

      if (uniqueFiles.length > 0) {
        data = await filesApi.fetchFiles(uniqueFiles);
      } else {
        data.success = true;
      }

      if (data.success) {
        const validatedBlocks = parsed.map((block) => {
          if (block.type === "move") {
            const sourceExists = !!data.contents[block.file];
            return {
              ...block,
              status: sourceExists ? ("match" as const) : ("no-match" as const),
            };
          }

          if (!block.search.trim() || block.file === "Active File") {
            return { ...block, status: "match" as const };
          }

          const content = data.contents[block.file];
          if (!content) return { ...block, status: "no-match" as const };

          const normContent = content.replace(/\r\n/g, "\n");
          const normSearch = block.search.replace(/\r\n/g, "\n");
          let isMatch = normContent.includes(normSearch);

          if (!isMatch) {
            const searchLines = normSearch
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);
            const contentLines = normContent
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);
            if (searchLines.length > 0) {
              isMatch = contentLines
                .join("\n")
                .includes(searchLines.join("\n"));
            }
          }

          if (!isMatch) {
            const tokenize = (str: string) =>
              str
                .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "")
                .replace(/\{\s*["']\s*["']\s*\}/g, "")
                .replace(/[\s,'"`();]+/g, "");

            const tokenSearch = tokenize(normSearch);
            const tokenContent = tokenize(normContent);
            if (tokenSearch.length > 0) {
              isMatch = tokenContent.includes(tokenSearch);
            }
          }

          return {
            ...block,
            status: isMatch ? ("match" as const) : ("no-match" as const),
          };
        });
        setDiffBlocks(validatedBlocks);
      } else {
        setDiffBlocks(parsed);
      }
    } catch (err) {
      console.error("Failed to parse pasted text: ", err);
      setToastMessage("Error parsing clipboard text.");
    }
  };

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
          />
        </aside>

        <section className="flex-1 min-w-0 overflow-hidden">
          <DiffPanel
            pastedContent={pastedContent}
            parsedBlocks={diffBlocks}
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
        hasChanges={diffBlocks.length > 0}
        diffBlocks={diffBlocks}
        onApplySuccess={handleApplySuccess}
      />

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}