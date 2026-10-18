export type DiffViewMode = "in-out" | "unified";

export interface DiffBlock {
  id: string;
  file: string;
  status: "match" | "no-match" | "collision" | "chained";
  ignored?: boolean;
  search: string;
  replace: string;
  // "edit" (default, omitted) is a normal SEARCH/REPLACE block.
  // "move" represents a MOVE/RENAME directive: `file` is the source path,
  // `moveTo` is the destination — search/replace are unused and left "".
    // "edit" (default, omitted) is a normal SEARCH/REPLACE block.
  // "move" represents a MOVE/RENAME directive: `file` is the source path,
  // `moveTo` is the destination — search/replace are unused and left "".
  // "delete" represents a DELETE/RM directive: `file` is the target path.
  type?: "edit" | "move" | "delete";
  // Explicit change classification, computed once at parse time so the UI
  // never has to re-derive it from search/moveTo:
  // - CREATE: empty SEARCH (a brand-new file / full overwrite block)
  // - MOVE / RENAME: a move directive, distinguished by which verb the
  //   AI response used
  // - EDIT: a normal SEARCH/REPLACE block where a real match was attempted
  // - DELETE: a delete/removal directive
  changeType: "CREATE" | "EDIT" | "MOVE" | "RENAME" | "DELETE";
  moveTo?: string;
  matchedFile?: string;
  isCodeMatched?: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface HistoryLog {
  id: string;
  timestamp: string;
  files: string[];
  message: string;
}
