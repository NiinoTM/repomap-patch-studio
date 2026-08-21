export type DiffViewMode = "in-out" | "unified";

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
  // Explicit change classification, computed once at parse time so the UI
  // never has to re-derive it from search/moveTo:
  // - CREATE: empty SEARCH (a brand-new file / full overwrite block)
  // - MOVE / RENAME: a move directive, distinguished by which verb the
  //   AI response used
  // - EDIT: a normal SEARCH/REPLACE block where a real match was attempted
  changeType: "CREATE" | "EDIT" | "MOVE" | "RENAME";
  moveTo?: string;
  matchedFile?: string;
  isCodeMatched?: boolean;
}

export interface HistoryLog {
  id: string;
  timestamp: string;
  files: string[];
  message: string;
}
