export interface DiffBlock {
  id: string;
  file: string;
  status: "match" | "no-match";
  search: string;
  replace: string;
}

export interface HistoryLog {
  id: string;
  timestamp: string;
  files: string[];
  message: string;
}
