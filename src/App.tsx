import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { PromptPanel } from "./components/PromptPanel";
import { DiffPanel } from "./components/DiffPanel";
import { Footer } from "./components/Footer";
import { Toast } from "./components/Toast";
import { DiffBlock, HistoryLog } from "./types";
import { parseDiffBlocks } from "./utils/diffParser";

export default function App() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pastedContent, setPastedContent] = useState("");
  const [diffBlocks, setDiffBlocks] = useState<DiffBlock[]>([]);
  const [repoPath, setRepoPath] = useState<string>("Loading...");
  const [repoFiles, setRepoFiles] = useState<string[]>([]);
  const [repoMap, setRepoMap] = useState<string>("");
  const [fileStats, setFileStats] = useState<
    Record<string, { size: number; tokens: number }>
  >({});
  const [dependencyMap, setDependencyMap] = useState<{
    outbound: Record<string, string[]>;
    inbound: Record<string, string[]>;
  }>({ outbound: {}, inbound: {} });
  const [tokenStats, setTokenStats] = useState({
    total: 0,
    map: 0,
    files: 0,
    selectedCount: 0,
  });
  const [logs, setLogs] = useState<HistoryLog[]>([]);

  // Pulls real commit history from the backend (`git log`) for the
  // "Recent AI Edits" drawer. Re-run after every successful apply/commit
  // and after a git-reset undo, so the drawer never goes stale.
  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Failed to fetch git history:", err);
    }
  };

  useEffect(() => {
    fetch("/api/repo")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRepoPath(data.path);
          setRepoFiles(data.files);
          setRepoMap(data.repoMap);
          setFileStats(data.fileStats || {});
          setDependencyMap(data.dependencyMap || { outbound: {}, inbound: {} });
        }
      })
      .catch((err) => console.error("Failed to fetch repo context:", err));
  }, []);

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleChangeRepo = async (newPath: string) => {
    if (!newPath || newPath === repoPath) return;

    try {
      const res = await fetch("/api/repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPath }),
      });
      const data = await res.json();
      if (data.success) {
        setRepoPath(data.path);
        setRepoFiles(data.files);
        setRepoMap(data.repoMap);
        setFileStats(data.fileStats || {});
        setDependencyMap(data.dependencyMap || { outbound: {}, inbound: {} });
        setToastMessage("Repository context updated successfully!");
        fetchHistory();
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Failed to update repository path. Ensure backend is running.");
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
    fetchHistory();
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
        const res = await fetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: uniqueFiles }),
        });
        data = await res.json();
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
        onUndoSuccess={fetchHistory}
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
