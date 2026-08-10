import { execSync } from "child_process";

export interface NativeFolderDialogResult {
  path: string;
  /** True if the dialog opened but the user closed/cancelled it (not an error). */
  cancelled: boolean;
  /** Populated only when the dialog itself failed to launch/run. */
  error?: string;
}

/**
 * Opens platform-native folder selection dialog and returns the selected directory path.
 * Distinguishes "user cancelled" from "dialog failed to launch" instead of
 * collapsing both into an empty string, so callers can surface real errors.
 */
export function openNativeFolderDialog(): NativeFolderDialogResult {
  let cmd: string;
  if (process.platform === "win32") {
    cmd = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.ValidateNames = $false; $f.CheckFileExists = $false; $f.CheckPathExists = $true; $f.FileName = 'Select This Folder'; $f.Title = 'Select Repository Folder'; if($f.ShowDialog() -eq 'OK') { [System.IO.Path]::GetDirectoryName($f.FileName) }"`;
  } else if (process.platform === "darwin") {
    cmd = `osascript -e 'POSIX path of (choose folder)'`;
  } else {
    cmd = `zenity --file-selection --directory 2>/dev/null || kdialog --getexistingdirectory 2>/dev/null`;
  }

  try {
    const output = execSync(cmd, { encoding: "utf-8" }).trim();
    // Empty output with a zero exit code means the dialog opened and the
    // user cancelled/closed it — that's expected, not an error.
    return { path: output, cancelled: output === "" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("openNativeFolderDialog failed:", message);
    return {
      path: "",
      cancelled: false,
      error:
        process.platform === "win32"
          ? `Failed to launch the Windows folder dialog (${message}). This usually means the server process has no interactive desktop session, or PowerShell execution policy is blocking the command.`
          : `Failed to launch the native folder dialog (${message}).`,
    };
  }
}
