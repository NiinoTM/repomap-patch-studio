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
  const [dependencyMap, setDependencyMap] = useState<Record<string, string[]>>(
    {},
  );

  useEffect(() => {
    fetch("/api/repo")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setRepoPath(data.path);
          setRepoFiles(data.files);
          setRepoMap(data.repoMap);
          setFileStats(data.fileStats || {});
          setDependencyMap(data.dependencyMap || {});
        }
      })
      .catch((err) => console.error("Failed to fetch repo context:", err));
  }, []);

  const handleChangeRepo = async () => {
    const newPath = prompt("Enter absolute path to your repository:", repoPath);
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
        setToastMessage("Repository context updated successfully!");
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Failed to update repository path. Ensure backend is running.");
    }
  };

  const mockLogs: HistoryLog[] = [
    {
      id: "c4f2a91",
      timestamp: "10 mins ago",
      files: ["src/App.tsx"],
      message: "ai-edit: Add routing to App.tsx",
    },
    {
      id: "8a1b3c4",
      timestamp: "1 hour ago",
      files: ["src/components/Button.tsx"],
      message: "ai-edit: fix button padding",
    },
    {
      id: "f2d4e56",
      timestamp: "2 hours ago",
      files: ["tailwind.config.js"],
      message: "ai-edit: add custom colors",
    },
    {
      id: "1e2f3a4",
      timestamp: "Yesterday",
      files: ["package.json"],
      message: "ai-edit: install lucide-react",
    },
  ];

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

      // Exclude "Active File" from the backend validation fetch
      // since it doesn't represent a real file path yet.
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
        data.success = true; // Proceed even if we only have "Active File" blocks
      }

      if (data.success) {
        const validatedBlocks = parsed.map((block) => {
          if (!block.search.trim() || block.file === "Active File") {
            return { ...block, status: "match" as const };
          }

          const content = data.contents[block.file];
          if (!content) return { ...block, status: "no-match" as const };

          // 1. Exact match test
          const normContent = content.replace(/\r\n/g, "\n");
          const normSearch = block.search.replace(/\r\n/g, "\n");
          let isMatch = normContent.includes(normSearch);

          // 2. Fuzzy whitespace match test (ignores leading indentation spaces)
          if (!isMatch) {
            const searchLines = normSearch.split('\n').map(l => l.trim()).filter(Boolean);
            const contentLines = normContent.split('\n').map(l => l.trim()).filter(Boolean);
            if (searchLines.length > 0) {
              isMatch = contentLines.join('\n').includes(searchLines.join('\n'));
            }
          }

          // 3. Ultra-Lenient Token Stream (Ignores multi-line, spaces, commas, AND quote styles)
          if (!isMatch) {
            const tokenize = (str: string) => str.replace(/[\s,'"`]+/g, '');
            const tokenSearch = tokenize(normSearch);
            const tokenContent = tokenize(normContent);
            if (tokenSearch.length > 0) {
              isMatch = tokenContent.includes(tokenSearch);
            }
          }

          return { ...block, status: isMatch ? 'match' as const : 'no-match' as const };
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

        <section className="flex-1 min-w-0 overflow-hidden">
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
