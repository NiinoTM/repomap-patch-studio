import { handleResponse } from "./client";
import { ApplyPayload, ApplyResponse, UndoResponse } from "../types/api";

export const patchApi = {
  apply: (payload: ApplyPayload): Promise<ApplyResponse> =>
    fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handleResponse<ApplyResponse>),

  undo: (): Promise<UndoResponse> =>
    fetch("/api/undo", {
      method: "POST",
    }).then(handleResponse<UndoResponse>),
};
