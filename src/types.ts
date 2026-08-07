export interface DiffBlock {
  id: string;
  file: string;
  status: "match" | "no-match";
  search: string;
  replace: string;
  // "edit" (default, omitted) is a normal SEARCH/REPLACE block.
  // "move" represents a MOVE/RENAME directive: `file` is the source path,
  // `moveTo` is the destination — search/replace are unused and left "".
  type?: "edit" | "move";
  moveTo?: string;
}

export interface HistoryLog {
  id: string;
  timestamp: string;
  files: string[];
  message: string;
}
