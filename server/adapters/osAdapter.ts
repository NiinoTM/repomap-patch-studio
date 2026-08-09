import { execSync } from "child_process";

/**
 * Opens platform-native folder selection dialog and returns the selected directory path.
 */
export function openNativeFolderDialog(): string {
  let cmd: string;
  if (process.platform === "win32") {
    cmd = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.ValidateNames = $false; $f.CheckFileExists = $false; $f.CheckPathExists = $true; $f.FileName = 'Select This Folder'; $f.Title = 'Select Repository Folder'; if($f.ShowDialog() -eq 'OK') { [System.IO.Path]::GetDirectoryName($f.FileName) }"`;
  } else if (process.platform === "darwin") {
    cmd = `osascript -e 'POSIX path of (choose folder)'`;
  } else {
    cmd = `zenity --file-selection --directory 2>/dev/null || kdialog --getexistingdirectory 2>/dev/null`;
  }

  try {
    return execSync(cmd, { encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}