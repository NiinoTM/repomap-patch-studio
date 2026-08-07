// server.js
import express from "express";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const app = express();
app.use(express.json());

let targetRepoPath = process.cwd();

// Helper to recursively get files
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

// AST-Lite Heuristic Parser (Strips implementation details, extracts signatures like Aider)
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
        // Extract Classes, Functions, Interfaces, Types
        let match = trimmed.match(
          /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|interface|type)\s+([A-Za-z0-9_]+)/,
        );
        if (match) {
          symbols.push(trimmed.replace(/\s*\{.*$/, ""));
          continue;
        }
        // Extract Arrow Functions assigned to variables
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

// Helper to calculate file sizes & estimated tokens (~3.8 chars per token for code)
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

// Helper to build a Dependency Map of imports between files
const getDependencyMap = (basePath, filesList) => {
  const depMap = {};
  const fileSet = new Set(filesList);

  for (const file of filesList) {
    const ext = path.extname(file).toLowerCase();
    if (![".js", ".jsx", ".ts", ".tsx"].includes(ext)) continue;

    try {
      const fullPath = path.join(basePath, file);
      const content = fs.readFileSync(fullPath, "utf-8");
      const imports = new Set();

      // Matches import/export statements: import ... from '...' or require('...')
      const importRegex =
        /(?:import|export)\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        let importPath = match[1] || match[2];
        if (!importPath) continue;

        // Resolve path aliases like `@/`
        if (importPath.startsWith("@/")) {
          importPath = "./" + importPath.slice(2);
        }

        // Only resolve local relative imports (starting with . or /)
        if (importPath.startsWith(".")) {
          const fileDir = path.dirname(file);
          const rawResolved = path
            .normalize(path.join(fileDir, importPath))
            .replace(/\\/g, "/");

          // Candidate file extensions to test
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
        depMap[file] = Array.from(imports);
      }
    } catch (e) {
      /* ignore read errors */
    }
  }

  return depMap;
};

// API: Get Current Repo Path, Files, Repo Map, Stats & Dependency Map
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

// API: Change Repo Path
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

// API: Fetch File Contents for Prompt Assembly
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

// Helper to find exact character ranges ignoring comments, newlines, whitespace, JSX {" "}, commas, quotes, parens, and semicolons
function findCondensedRange(content, search) {
  const preCleanContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').replace(/\{\s*["']\s*["']\s*\}/g, '');
  const cleanSearch = search
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
    .replace(/\{\s*["']\s*["']\s*\}/g, '')
    .replace(/[\s,'"`();]+/g, '');

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

// 1. API: Apply Changes & Commit to Git (with Multi-line & Indentation Recovery)
app.post('/api/apply', (req, res) => {
  const { blocks, commitMessage } = req.body;

  try {
    try {
      execSync('git add . && git commit -m "pre-ai-edit"', {
        cwd: targetRepoPath,
        stdio: "ignore",
      });
    } catch (e) {
      /* ignore */
    }

    for (const block of blocks) {
      const fullPath = path.resolve(targetRepoPath, block.file);
      if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, block.replace, "utf-8");
        continue;
      }

      let content = fs.readFileSync(fullPath, "utf-8");

      if (!block.search.trim() || block.file === "Active File") {
        fs.writeFileSync(fullPath, block.replace, "utf-8");
        continue;
      }

      const normContent = content.replace(/\r\n/g, "\n");
      const normSearch = block.search.replace(/\r\n/g, "\n");
      const normReplace = block.replace.replace(/\r\n/g, "\n");

      if (normContent.includes(normSearch)) {
        // Exact match
        const updated = normContent.replace(normSearch, normReplace);
        fs.writeFileSync(fullPath, updated, "utf-8");
      } else {
        // Smart Fuzzy Indentation Replacement
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
          // Detect original indentation of the target line
          const indentMatch = contentLines[matchIndex].match(/^[ \t]*/);
          const indent = indentMatch ? indentMatch[0] : '';

          const replaceLines = normReplace.split('\n').map(line => {
            return line.trim() ? indent + line.replace(/^[ \t]*/, '') : '';
          });

          contentLines.splice(matchIndex, searchLines.length, ...replaceLines);
          fs.writeFileSync(fullPath, contentLines.join('\n'), 'utf-8');
        } else {
          // 3. Condensed Token Stream Replacement
          const cleanNormContent = normContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').replace(/\{\s*["']\s*["']\s*\}/g, '');
          const range = findCondensedRange(normContent, normSearch);
          if (range) {
            const updated = cleanNormContent.slice(0, range.start) + normReplace + cleanNormContent.slice(range.end);
            fs.writeFileSync(fullPath, updated, 'utf-8');
          } else {
            console.warn(`[Apply Warning] Could not find SEARCH block for ${block.file}. File left untouched to prevent corruption.`);
          }
        }
      }
    }

    // AUTO-FORMAT MODIFIED FILES WITH PRETTIER
    for (const block of blocks) {
      if (block.file && block.file !== 'Active File') {
        try {
          execSync(`npx prettier --write "${block.file}"`, { cwd: targetRepoPath, stdio: 'ignore' });
        } catch (e) {
          // Gracefully ignore if prettier fails or is unsupported for this file
        }
      }
    }

    execSync(`git add . && git commit -m "${commitMessage || 'ai-edit: updated files'}"`, { cwd: targetRepoPath, stdio: 'ignore' });
    res.json({ success: true, message: 'Changes applied, auto-formatted & committed to Git!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. API: Git Reset / Undo Last Edit
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
