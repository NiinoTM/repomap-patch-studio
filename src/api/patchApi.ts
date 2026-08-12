import { handleResponse } from "./client";
import {
  ApplyPayload,
  ApplyResponse,
  ApplyProgressEvent,
  UndoResponse,
} from "../types/api";

export const patchApi = {
  apply: (payload: ApplyPayload): Promise<ApplyResponse> =>
    fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handleResponse<ApplyResponse>),

  // Streaming variant: same endpoint, reads the NDJSON response body
  // incrementally, calling onProgress for each stage event and resolving
  // with the final "result" line as the ApplyResponse.
  applyStream: async (
    payload: ApplyPayload,
    onProgress: (event: ApplyProgressEvent) => void,
  ): Promise<ApplyResponse> => {
    const res = await fetch("/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok || !res.body) {
      return handleResponse<ApplyResponse>(res);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: ApplyResponse | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line) continue;

        const event = JSON.parse(line);
        if (event.type === "progress") {
          onProgress(event as ApplyProgressEvent);
        } else if (event.type === "result") {
          result = event as ApplyResponse;
        }
      }
    }

    if (!result) {
      throw new Error("Server closed the connection before sending a result.");
    }
    return result;
  },

  undo: (): Promise<UndoResponse> =>
    fetch("/api/undo", {
      method: "POST",
    }).then(handleResponse<UndoResponse>),
};
