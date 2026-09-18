import { exec } from "child_process";
import fs from "fs";
import path from "path";

export interface BootstrapResult {
  success: boolean;
  packageManager: string;
  output: string;
  error?: string;
}

function detectPackageManager(repoPath: string): string {
  if (fs.existsSync(path.join(repoPath, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(repoPath, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(repoPath, "bun.lockb"))) return "bun";
  return "npm";
}

function execCommand(command: string, cwd: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd, windowsHide: true, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || stdout || err.message));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

export async function ensureGitRepository(repoPath: string): Promise<string> {
  const gitDir = path.join(repoPath, ".git");
  if (!fs.existsSync(gitDir)) {
    let output = "";
    const initRes = await execCommand("git init", repoPath);
    output += `[git init]\n${initRes.stdout}\n`;

    const gitignorePath = path.join(repoPath, ".gitignore");
    if (!fs.existsSync(gitignorePath)) {
      fs.writeFileSync(gitignorePath, "node_modules/\ndist/\n.env\n*.log\n");
      await execCommand("git add .gitignore", repoPath);
    }

    try {
      const commitCmd =
        'git -c user.name="RepoMap" -c user.email="repomap@local" commit --allow-empty -m "chore: initialize repository with .gitignore"';
      const commitRes = await execCommand(commitCmd, repoPath);
      output += `[initial commit]\n${commitRes.stdout}\n`;
    } catch (commitErr: unknown) {
      const msg = commitErr instanceof Error ? commitErr.message : String(commitErr);
      output += `[initial commit note]: ${msg}\n`;
    }

    return output;
  }
  return "";
}

async function installDependencies(pkgManager: string, repoPath: string): Promise<string> {
  const installCmd = `${pkgManager} install`;
  try {
    const res = await execCommand(installCmd, repoPath);
    return `[${installCmd}]\n${res.stdout}\n`;
  } catch (err: unknown) {
    if (pkgManager === "npm") {
      const fallbackCmd = "npm install --legacy-peer-deps";
      const fallbackRes = await execCommand(fallbackCmd, repoPath);
      return `[${fallbackCmd}]\n${fallbackRes.stdout}\n`;
    }
    throw err;
  }
}

async function setupHuskyIfPresent(repoPath: string): Promise<string> {
  const isGit = fs.existsSync(path.join(repoPath, ".git"));
  const huskyDir = path.join(repoPath, ".husky");
  if (!isGit || !fs.existsSync(huskyDir)) return "";

  try {
    const res = await execCommand("npx husky", repoPath);
    return `\n[npx husky]\n${res.stdout}\n`;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return `\n[npx husky note]: ${msg}\n`;
  }
}

export async function bootstrapRepository(repoPath: string): Promise<BootstrapResult> {
  const packageManager = detectPackageManager(repoPath);
  const pkgJsonPath = path.join(repoPath, "package.json");

  if (!fs.existsSync(pkgJsonPath)) {
    return {
      success: false,
      packageManager,
      output: "",
      error: "No package.json found in the target repository.",
    };
  }

  let fullOutput = "";
  try {
    fullOutput += await ensureGitRepository(repoPath);
    fullOutput += await installDependencies(packageManager, repoPath);
    fullOutput += await setupHuskyIfPresent(repoPath);

    return { success: true, packageManager, output: fullOutput.trim() };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, packageManager, output: fullOutput.trim(), error: errorMsg };
  }
}