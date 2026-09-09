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

export async function bootstrapRepository(repoPath: string): Promise<BootstrapResult> {
  const pkgManager = detectPackageManager(repoPath);
  const pkgJsonPath = path.join(repoPath, "package.json");

  if (!fs.existsSync(pkgJsonPath)) {
    return {
      success: false,
      packageManager: pkgManager,
      output: "",
      error: "No package.json found in the target repository.",
    };
  }

  let fullOutput = "";

  try {
    const installCmd = `${pkgManager} install`;
    const installRes = await execCommand(installCmd, repoPath);
    fullOutput += `[${installCmd}]\n${installRes.stdout}\n`;

    const huskyDir = path.join(repoPath, ".husky");
    if (fs.existsSync(huskyDir)) {
      try {
        const huskyCmd = "npx husky";
        const huskyRes = await execCommand(huskyCmd, repoPath);
        fullOutput += `\n[${huskyCmd}]\n${huskyRes.stdout}\n`;
      } catch (huskyErr: unknown) {
        const msg = huskyErr instanceof Error ? huskyErr.message : String(huskyErr);
        fullOutput += `\n[npx husky note]: ${msg}\n`;
      }
    }

    return {
      success: true,
      packageManager: pkgManager,
      output: fullOutput.trim(),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      packageManager: pkgManager,
      output: fullOutput.trim(),
      error: errorMsg,
    };
  }
}