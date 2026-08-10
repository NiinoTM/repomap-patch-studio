import { exec } from "child_process";

export interface NativeFolderDialogResult {
  path: string;
  /** True if the dialog opened but the user closed/cancelled it (not an error). */
  cancelled: boolean;
  /** Populated only when the dialog itself failed to launch/run. */
  error?: string;
}

/**
 * Opens platform-native folder selection dialog and returns the selected directory path.
 *
 * Uses async `exec` (not `execSync`) deliberately: Node's event loop is
 * single-threaded, so a synchronous call here would freeze every other
 * in-flight request on the server for as long as the dialog stays open.
 * Async exec keeps the rest of the app responsive while the user picks.
 */
export function openNativeFolderDialog(): Promise<NativeFolderDialogResult> {
  let cmd: string;
  if (process.platform === "win32") {
    cmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.ValidateNames = $false; $f.CheckFileExists = $false; $f.CheckPathExists = $true; $f.FileName = 'Select This Folder'; $f.Title = 'Select Repository Folder'; if($f.ShowDialog() -eq 'OK') { [System.IO.Path]::GetDirectoryName($f.FileName) }"`;
  } else if (process.platform === "darwin") {
    cmd = `osascript -e 'POSIX path of (choose folder)'`;
  } else {
    cmd = `zenity --file-selection --directory 2>/dev/null || kdialog --getexistingdirectory 2>/dev/null`;
  }

  console.log(
    `openNativeFolderDialog: launching dialog for platform "${process.platform}"...`,
  );

  return new Promise((resolve) => {
    exec(cmd, { encoding: "utf-8", timeout: 120_000 }, (err, stdout) => {
      if (err) {
        const isTimeout = err.killed === true || err.signal === "SIGTERM";
        console.error(
          "openNativeFolderDialog failed:",
          err.message,
          isTimeout ? "(timed out after 120s)" : "",
        );
        resolve({
          path: "",
          cancelled: false,
          error: isTimeout
            ? "The folder dialog timed out after 120s without a response. Under RDP this usually means your session was disconnected or minimized while the dialog was open — the dialog needs an active, rendered desktop to receive input. Reconnect your RDP session and try again without disconnecting."
            : process.platform === "win32"
              ? `Failed to launch the Windows folder dialog (${err.message}). This usually means the server process has no interactive desktop session, or PowerShell execution policy is blocking the command.`
              : `Failed to launch the native folder dialog (${err.message}).`,
        });
        return;
      }
      const output = stdout.trim();
      console.log(`openNativeFolderDialog: command returned "${output}"`);
      // Empty output with a zero exit code means the dialog opened and the
      // user cancelled/closed it — that's expected, not an error.
      resolve({ path: output, cancelled: output === "" });
    });
  });
}
