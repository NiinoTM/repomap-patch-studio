import express from "express";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { transformSync } from "esbuild";

const app = express();
app.use(express.json());

let targetRepoPath = process.cwd();

const getAllFiles = (dir, basePath = dir, fileList = []) => {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (
        ![
          "node_modules",
          ".git",
          "dist",
          "build",
          "coverage",
          ".vscode",
          ".idea",
        ].includes(file)
      ) {
        getAllFiles(filePath, basePath, fileList);
      }
    } else {
      fileList.push(path.relative(basePath, filePath).replace(/\\/g, "/"));
    }
  }
  return fileList;
};

const generateRepoMap = (basePath, filesList) => {
  let mapOutput = "";
  for (const file of filesList) {
    const fullPath = path.join(basePath, file);
    const ext = path.extname(file).toLowerCase();
    let content;
    try {
      content = fs.readFileSync(fullPath, "utf-8");
    } catch (e) {
      continue;
    }

    let symbols = [];
    const lines = content.split("\n");

    for (let line of lines) {
      const trimmed = line.trim();
      if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
        let match = trimmed.match(
          /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|interface|type)\s+([A-Za-z0-9_]+)/,
        );
        if (match) {
          symbols.push(trimmed.replace(/\s*\{.*$/, ""));
          continue;
        }

        match = trimmed.match(
          /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>/,
        );
        if (match) {
          symbols.push(trimmed.replace(/\s*=>.*$/, "=> { ... }"));
          continue;
        }
      } else if ([".py"].includes(ext)) {
        if (/^(?:async\s+)?(?:def|class)\s+[A-Za-z0-9_]+/.test(trimmed)) {
          symbols.push(trimmed.replace(/:.*$/, ""));
        }
      } else if ([".go"].includes(ext)) {
        if (
          /^func\s+[A-Za-z0-9_]+/.test(trimmed) ||
          /^type\s+[A-Za-z0-9_]+\s+(?:struct|interface)/.test(trimmed)
        ) {
          symbols.push(trimmed.replace(/\{.*$/, ""));
        }
      }
    }

    if (symbols.length > 0) {
      mapOutput += file + ":\n";
      symbols.forEach((s) => (mapOutput += "│ " + s + "\n"));
    } else {
      mapOutput += file + "\n";
    }
  }
  return mapOutput.trim();
};

const getFileStats = (basePath, filesList) => {
  const stats = {};
  for (const file of filesList) {
    try {
      const fullPath = path.join(basePath, file);
      const size = fs.statSync(fullPath).size;
      stats[file] = { size, tokens: Math.ceil(size / 3.8) };
    } catch (e) {
      stats[file] = { size: 0, tokens: 0 };
    }
  }
  return stats;
};

const getDependencyMap = (basePath, filesList) => {
  const outbound = {};
  const inboundMap = {};
  const apiOutbound = {};
  const apiInboundMap = {};
  const fileSet = new Set(filesList);

  for (const file of filesList) {
    const ext = path.extname(file).toLowerCase();
    if (![".js", ".jsx", ".ts", ".tsx"].includes(ext)) continue;

    try {
      const fullPath = path.join(basePath, file);
      const content = fs.readFileSync(fullPath, "utf-8");
      const imports = new Set();

      const importRegex =
        /(?:import|export)\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        let importPath = match[1] || match[2];
        if (!importPath) continue;

        if (importPath.startsWith("@/")) {
          importPath = "./" + importPath.slice(2);
        }

        if (importPath.startsWith(".")) {
          const fileDir = path.dirname(file);
          const rawResolved = path
            .normalize(path.join(fileDir, importPath))
            .replace(/\\/g, "/");

          const candidates = [
            rawResolved,
            `${rawResolved}.tsx`,
            `${rawResolved}.ts`,
            `${rawResolved}.jsx`,
            `${rawResolved}.js`,
            `${rawResolved}/index.tsx`,
            `${rawResolved}/index.ts`,
            `${rawResolved}/index.jsx`,
            `${rawResolved}/index.js`,
          ];

          for (const cand of candidates) {
            if (fileSet.has(cand) && cand !== file) {
              imports.add(cand);
              break;
            }
          }
        }
      }

      if (imports.size > 0) {
        outbound[file] = Array.from(imports);
        for (const imp of imports) {
          if (!inboundMap[imp]) inboundMap[imp] = new Set();
          inboundMap[imp].add(file);
        }
      }
    } catch (e) {}
  }

  const routeHandlers = {};

  const apiRouteHandlerRegex =
    /(?:app|router|server)\s*\.\s*(?:get|post|put|delete|patch|all|use)\s*\(\s*[`'"]([^`'"]+)[`'"]/gi;

  for (const file of filesList) {
    const ext = path.extname(file).toLowerCase();
    if (![".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs"].includes(ext)) continue;

    try {
      const fullPath = path.join(basePath, file);
      const content = fs.readFileSync(fullPath, "utf-8");
      let match;
      while ((match = apiRouteHandlerRegex.exec(content)) !== null) {
        const route = match[1];
        if (route.startsWith("/api") || route.startsWith("/")) {
          if (!routeHandlers[route]) routeHandlers[route] = new Set();
          routeHandlers[route].add(file);
        }
      }
    } catch (e) {}
  }

  const apiClientRegex =
    /(?:fetch|axios\.(?:get|post|put|delete|patch)|apiCall)\s*\(\s*[`'"]([^`'"${}\n]+)[`'"]/gi;

  for (const file of filesList) {
    const ext = path.extname(file).toLowerCase();
    if (![".js", ".jsx", ".ts", ".tsx"].includes(ext)) continue;

    try {
      const fullPath = path.join(basePath, file);
      const content = fs.readFileSync(fullPath, "utf-8");
      let match;
      while ((match = apiClientRegex.exec(content)) !== null) {
        const rawRoute = match[1];
        const cleanRoute = rawRoute.split("?")[0].split("#")[0];

        if (routeHandlers[cleanRoute]) {
          for (const backendFile of routeHandlers[cleanRoute]) {
            if (backendFile !== file) {
              if (!apiOutbound[file]) apiOutbound[file] = [];
              if (!apiOutbound[file].includes(backendFile)) {
                apiOutbound[file].push(backendFile);
              }

              if (!apiInboundMap[backendFile])
                apiInboundMap[backendFile] = new Set();
              apiInboundMap[backendFile].add(file);
            }
          }
        }
      }
    } catch (e) {}
  }

  const inbound = {};
  for (const key in inboundMap) {
    inbound[key] = Array.from(inboundMap[key]);
  }

  const apiInbound = {};
  for (const key in apiInboundMap) {
    apiInbound[key] = Array.from(apiInboundMap[key]);
  }

  return { outbound, inbound, apiOutbound, apiInbound };
};

app.get("/api/repo", (req, res) => {
  try {
    const files = getAllFiles(targetRepoPath);
    const repoMap = generateRepoMap(targetRepoPath, files);
    const fileStats = getFileStats(targetRepoPath, files);
    const dependencyMap = getDependencyMap(targetRepoPath, files);
    res.json({
      success: true,
      path: targetRepoPath,
      files,
      repoMap,
      fileStats,
      dependencyMap,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/repo", (req, res) => {
  const { newPath } = req.body;
  if (fs.existsSync(newPath) && fs.statSync(newPath).isDirectory()) {
    targetRepoPath = path.resolve(newPath);
    const files = getAllFiles(targetRepoPath);
    const repoMap = generateRepoMap(targetRepoPath, files);
    const fileStats = getFileStats(targetRepoPath, files);
    const dependencyMap = getDependencyMap(targetRepoPath, files);
    res.json({
      success: true,
      path: targetRepoPath,
      files,
      repoMap,
      fileStats,
      dependencyMap,
    });
  } else {
    res
      .status(400)
      .json({ success: false, error: "Invalid or missing directory path." });
  }
});

app.post("/api/files", (req, res) => {
  const { files } = req.body;
  const contents = {};
  files.forEach((f) => {
    try {
      contents[f] = fs.readFileSync(path.join(targetRepoPath, f), "utf-8");
    } catch (e) {}
  });
  res.json({ success: true, contents });
});

app.post("/api/native-folder-dialog", (req, res) => {
  try {
    let cmd = "";
    if (process.platform === "win32") {
      cmd = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; if($f.ShowDialog() -eq 'OK') { $f.SelectedPath }"`;
    } else if (process.platform === "darwin") {
      cmd = `osascript -e 'POSIX path of (choose folder)'`;
    } else {
      // Linux: try zenity first, then kdialog
      cmd = `zenity --file-selection --directory 2>/dev/null || kdialog --getexistingdirectory 2>/dev/null`;
    }

    const selectedPath = execSync(cmd, { encoding: "utf-8" }).trim();
    // If user cancels, the command returns empty or non‑zero exit; we return empty path
    res.json({ success: true, path: selectedPath || "" });
  } catch (err) {
    // Dialog cancelled or command not found → return empty path
    res.json({ success: true, path: "" });
  }
});

function findCondensedRange(content, search) {
  const preCleanContent = content
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "")
    .replace(/\{\s*["']\s*["']\s*\}/g, "");
  const cleanSearch = search
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "")
    .replace(/\{\s*["']\s*["']\s*\}/g, "")
    .replace(/[\s,'"`();]+/g, "");

  if (!cleanSearch) return null;

  let cIdx = 0;
  let sIdx = 0;
  let startMatchPos = -1;

  while (cIdx < preCleanContent.length && sIdx < cleanSearch.length) {
    if (/[\s,'"`();]/.test(preCleanContent[cIdx])) {
      cIdx++;
      continue;
    }

    if (preCleanContent[cIdx] === cleanSearch[sIdx]) {
      if (sIdx === 0) startMatchPos = cIdx;
      sIdx++;
      cIdx++;
    } else {
      if (startMatchPos !== -1) {
        cIdx = startMatchPos + 1;
        startMatchPos = -1;
        sIdx = 0;
      } else {
        cIdx++;
      }
    }
  }

  if (sIdx === cleanSearch.length && startMatchPos !== -1) {
    return { start: startMatchPos, end: cIdx };
  }

  return null;
}

// Helper to validate JS/TS/JSX/TSX syntax in memory before writing
function validateSyntax(content, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (![".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"].includes(ext)) {
    return null; // Skip non-code files (JSON, CSS, Markdown, etc.)
  }

  try {
    let loader = ext.slice(1);
    if (!["js", "jsx", "ts", "tsx"].includes(loader)) loader = "js";

    transformSync(content, {
      loader,
      jsx: "transform",
      format: "esm",
    });
    return null; // Valid syntax!
  } catch (err) {
    const errorMsg =
      err.errors && err.errors[0]
        ? `${err.errors[0].text} (line ${err.errors[0].location?.line || "?"})`
        : err.message;
    return `Pre-flight SyntaxError in ${filePath}: ${errorMsg}`;
  }
}

// Pure In-Memory Block Application Engine (Exact, Fuzzy Indentation & Condensed Token Stream)
function applyBlockToContent(content, block) {
  if (!block.search || !block.search.trim() || block.file === "Active File") {
    return { success: true, newContent: block.replace };
  }

  const normContent = content.replace(/\r\n/g, "\n");
  const normSearch = block.search.replace(/\r\n/g, "\n");
  const normReplace = block.replace.replace(/\r\n/g, "\n");

  // 1. Exact Match
  if (normContent.includes(normSearch)) {
    return {
      success: true,
      newContent: normContent.replace(normSearch, normReplace),
    };
  }

  // 2. Smart Fuzzy Indentation Match
  const searchLines = normSearch
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const contentLines = normContent.split("\n");

  let matchIndex = -1;
  for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
    let isCandidate = true;
    for (let j = 0; j < searchLines.length; j++) {
      if (contentLines[i + j].trim() !== searchLines[j]) {
        isCandidate = false;
        break;
      }
    }
    if (isCandidate) {
      matchIndex = i;
      break;
    }
  }

  if (matchIndex !== -1) {
    const indentMatch = contentLines[matchIndex].match(/^[ \t]*/);
    const indent = indentMatch ? indentMatch[0] : "";
    const replaceLines = normReplace.split("\n").map((line) => {
      return line.trim() ? indent + line.replace(/^[ \t]*/, "") : "";
    });

    contentLines.splice(matchIndex, searchLines.length, ...replaceLines);
    return { success: true, newContent: contentLines.join("\n") };
  }

  // 3. Condensed Token Stream Replacement
  const range = findCondensedRange(normContent, normSearch);
  if (range) {
    const cleanNormContent = normContent
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "")
      .replace(/\{\s*["']\s*["']\s*\}/g, "");
    const newContent =
      cleanNormContent.slice(0, range.start) +
      normReplace +
      cleanNormContent.slice(range.end);
    return { success: true, newContent };
  }

  return {
    success: false,
    error: `SEARCH block match failed for file: ${block.file}`,
  };
}

// 1. Transactional API: Pre-Flight Validation -> In-Memory Syntax Check -> Deferred Disk Write
app.post("/api/apply", (req, res) => {
  const { blocks, commitMessage, skipCommit, commit, dryRun } = req.body;
  const shouldCommit = commit === true || (commit !== false && !skipCommit);
  const isDryRun = dryRun === true;

  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return res
      .status(400)
      .json({ success: false, error: "No diff blocks provided." });
  }

  try {
    // Git Safety Snapshot before writing (skipped entirely for dry-run validation passes)
    if (!isDryRun) {
      try {
        execSync('git add . && git commit -m "pre-ai-edit"', {
          cwd: targetRepoPath,
          stdio: "ignore",
        });
      } catch (e) {
        /* ignore git snapshot errors if tree is clean */
      }
    }

    // PHASE 1: IN-MEMORY DRY-RUN & SYNTAX VALIDATION
    const pendingWrites = new Map(); // filePath -> updatedContent
    const validationErrors = [];

    for (const block of blocks) {
      if (!block.file || block.file === "Active File") continue;
      const fullPath = path.resolve(targetRepoPath, block.file);

      // Get current in-memory content from previous blocks in batch, or read from disk
      let currentContent = pendingWrites.get(block.file);
      const fileExists = fs.existsSync(fullPath);

      if (currentContent === undefined) {
        currentContent = fileExists ? fs.readFileSync(fullPath, "utf-8") : "";
      }

      const result = applyBlockToContent(currentContent, block);
      if (result.success) {
        // Run Pre-Flight Syntax Check on the resulting content in memory!
        const syntaxError = validateSyntax(result.newContent, block.file);
        if (syntaxError) {
          validationErrors.push(syntaxError);
        } else {
          pendingWrites.set(block.file, result.newContent);
        }
      } else {
        validationErrors.push(result.error);
      }
    }

    // ALL-OR-NOTHING GATEKEEPER: Abort if any block failed pre-flight validation or syntax check
    if (validationErrors.length > 0) {
      const detailedMsg =
        `Transaction aborted. ${validationErrors.length} validation/syntax error(s) detected:\n` +
        validationErrors.map((err) => `• ${err}`).join("\n") +
        "\n\n0 files were modified on disk.";

      return res.status(422).json({
        success: false,
        error: detailedMsg,
        details: validationErrors,
      });
    }

    // DRY-RUN: validation & syntax checks passed, but stop here — nothing is
    // written to disk and no commit happens. This lets the client confirm/edit
    // a commit message with full confidence the batch will actually succeed.
    if (isDryRun) {
      return res.json({
        success: true,
        dryRun: true,
        message: "✅ Pre-flight validation passed. No files were modified.",
        validatedFiles: Array.from(pendingWrites.keys()),
      });
    }

    const CRITICAL_FILES = [
      "server.js",
      "package.json",
      "vite.config.ts",
      "tsconfig.json",
    ];
    const filesToCommit = Array.from(pendingWrites.keys()).sort((a, b) => {
      const isACritical = CRITICAL_FILES.some((f) => a.endsWith(f));
      const isBCritical = CRITICAL_FILES.some((f) => b.endsWith(f));
      if (isACritical && !isBCritical) return 1;
      if (!isACritical && isBCritical) return -1;
      return 0;
    });

    for (const file of filesToCommit) {
      const fullPath = path.resolve(targetRepoPath, file);
      const dirPath = path.dirname(fullPath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(fullPath, pendingWrites.get(file), "utf-8");
    }

    for (const file of filesToCommit) {
      try {
        execSync(`npx prettier --write "${file}"`, {
          cwd: targetRepoPath,
          stdio: "ignore",
        });
      } catch (e) {}
    }

    if (shouldCommit) {
      const msg =
        commitMessage && commitMessage.trim()
          ? commitMessage.trim()
          : "ai-edit: updated files";
      execSync(`git add . && git commit -m "${msg}"`, {
        cwd: targetRepoPath,
        stdio: "ignore",
      });
    }

    res.json({
      success: true,
      message: shouldCommit
        ? "✅ Transaction complete: Edits applied, formatted & committed to Git!"
        : "✅ Transaction complete: Edits applied to disk!",
      appliedFiles: filesToCommit,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/undo", (req, res) => {
  try {
    execSync("git reset --hard HEAD~1", {
      cwd: targetRepoPath,
      stdio: "ignore",
    });
    res.json({
      success: true,
      message: "Hard reset to previous commit successful!",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3001, () =>
  console.log("🚀 Local Patch Backend running on http://localhost:3001"),
);
