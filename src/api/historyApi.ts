import { handleResponse } from "./client";
import { HistoryResponse } from "../types/api";

export const historyApi = {
  fetchHistory: (): Promise<HistoryResponse> =>
    fetch("/api/history").then(handleResponse<HistoryResponse>),
};
