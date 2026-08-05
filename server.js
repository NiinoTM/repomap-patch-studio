// server.js
import express from 'express';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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
      if (!['node_modules', '.git', 'dist', 'build', 'coverage', '.vscode', '.idea'].includes(file)) {
        getAllFiles(filePath, basePath, fileList);
      }
    } else {
      fileList.push(path.relative(basePath, filePath).replace(/\\/g, '/'));
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
    try { content = fs.readFileSync(fullPath, 'utf-8'); } catch (e) { continue; }

    let symbols = [];
    const lines = content.split('\n');
    
    for (let line of lines) {
      const trimmed = line.trim();
      if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
        // Extract Classes, Functions, Interfaces, Types
        let match = trimmed.match(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|interface|type)\s+([A-Za-z0-9_]+)/);
        if (match) { symbols.push(trimmed.replace(/\s*\{.*$/, '')); continue; }
        // Extract Arrow Functions assigned to variables
        match = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>/);
        if (match) { symbols.push(trimmed.replace(/\s*=>.*$/, '=> { ... }')); continue; }
      } else if (['.py'].includes(ext)) {
        if (/^(?:async\s+)?(?:def|class)\s+[A-Za-z0-9_]+/.test(trimmed)) { symbols.push(trimmed.replace(/:.*$/, '')); }
      } else if (['.go'].includes(ext)) {
        if (/^func\s+[A-Za-z0-9_]+/.test(trimmed) || /^type\s+[A-Za-z0-9_]+\s+(?:struct|interface)/.test(trimmed)) { symbols.push(trimmed.replace(/\{.*$/, '')); }
      }
    }

    if (symbols.length > 0) {
      mapOutput += file + ":\n";
      symbols.forEach(s => mapOutput += "│ " + s + "\n");
    } else {
      mapOutput += file + "\n";
    }
  }
  return mapOutput.trim();
};

// API: Get Current Repo Path, Files & Repo Map
app.get('/api/repo', (req, res) => {
  try {
    const files = getAllFiles(targetRepoPath);
    const repoMap = generateRepoMap(targetRepoPath, files);
    res.json({ success: true, path: targetRepoPath, files, repoMap });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Change Repo Path
app.post('/api/repo', (req, res) => {
  const { newPath } = req.body;
  if (fs.existsSync(newPath) && fs.statSync(newPath).isDirectory()) {
    targetRepoPath = path.resolve(newPath);
    const files = getAllFiles(targetRepoPath);
    const repoMap = generateRepoMap(targetRepoPath, files);
    res.json({ success: true, path: targetRepoPath, files, repoMap });
  } else {
    res.status(400).json({ success: false, error: 'Invalid or missing directory path.' });
  }
});

// API: Fetch File Contents for Prompt Assembly
app.post('/api/files', (req, res) => {
  const { files } = req.body;
  const contents = {};
  files.forEach(f => {
    try { contents[f] = fs.readFileSync(path.join(targetRepoPath, f), 'utf-8'); } catch(e){}
  });
  res.json({ success: true, contents });
});

// 1. API: Apply Changes & Commit to Git
app.post('/api/apply', (req, res) => {
  const { blocks, commitMessage } = req.body;

  try {
    // Git Safety Checkpoint BEFORE editing (wrapped in try/catch to not crash if nothing to commit)
    try { execSync('git add . && git commit -m "pre-ai-edit"', { cwd: targetRepoPath, stdio: 'ignore' }); } catch (e) { /* ignore */ }

    // Apply each diff block to the real file system
    for (const block of blocks) {
      const fullPath = path.resolve(targetRepoPath, block.file);

      // Handle Full Overwrites or Empty Search Blocks
      if (!block.search.trim()) {
        fs.writeFileSync(fullPath, block.replace, 'utf-8');
      } else {
        // Handle Partial Search & Replace
        let content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes(block.search)) {
          content = content.replace(block.search, block.replace);
          fs.writeFileSync(fullPath, content, 'utf-8');
        }
      }
    }

    // Git Commit AFTER editing
    execSync(`git add . && git commit -m "${commitMessage || 'ai-edit: updated files'}"`, { cwd: targetRepoPath, stdio: 'ignore' });
    res.json({ success: true, message: 'Changes applied and committed to Git!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. API: Git Reset / Undo Last Edit
app.post('/api/undo', (req, res) => {
  try {
    execSync('git reset --hard HEAD~1', { cwd: targetRepoPath, stdio: 'ignore' });
    res.json({ success: true, message: 'Hard reset to previous commit successful!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3001, () => console.log('🚀 Local Patch Backend running on http://localhost:3001'));