import fs from "fs";
import path from "path";

export const readTextFile = (fullPath: string): string =>
  fs.readFileSync(fullPath, "utf-8");

export const writeTextFile = (fullPath: string, content: string): void => {
  fs.writeFileSync(fullPath, content, "utf-8");
};

export const fileExists = (fullPath: string): boolean => fs.existsSync(fullPath);

export const isDirectory = (fullPath: string): boolean => {
  try {
    return fs.statSync(fullPath).isDirectory();
  } catch {
    return false;
  }
};

export const ensureDir = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

export const joinPath = (...segments: string[]): string => path.join(...segments);
export const resolvePath = (...segments: string[]): string => path.resolve(...segments);
export const dirnamePath = (p: string): string => path.dirname(p);
export const extnamePath = (p: string): string => path.extname(p);
export const normalizePath = (p: string): string => path.normalize(p);