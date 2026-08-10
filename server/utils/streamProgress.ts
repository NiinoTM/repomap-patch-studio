import { Response } from "express";

// Generic NDJSON stage-progress streaming for long-running route handlers.
// Not /apply-specific — any route streaming staged progress can reuse
// this. The two setTimeout yields per stage exist because Node won't
// flush pending socket writes across a blocking execSync call otherwise —
// without them, the client sees nothing until the whole handler
// finishes, which defeats the point of streaming.
export interface StageRunner {
  emit: (event: Record<string, unknown>) => void;
  runStage<T>(
    stage: string,
    label: string,
    fn: () => T | Promise<T>,
  ): Promise<T>;
}

export function createStageRunner(res: Response): StageRunner {
  const emit = (event: Record<string, unknown>) => {
    res.write(JSON.stringify(event) + "\n");
  };

  const runStage = async <T>(
    stage: string,
    label: string,
    fn: () => T | Promise<T>,
  ): Promise<T> => {
    emit({ type: "progress", stage, label, status: "start" });
    await new Promise((resolve) => setTimeout(resolve, 10));

    const startedAt = Date.now();
    try {
      const result = await fn();
      emit({
        type: "progress",
        stage,
        label,
        status: "done",
        durationMs: Date.now() - startedAt,
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
      return result;
    } catch (err) {
      emit({
        type: "progress",
        stage,
        label,
        status: "error",
        durationMs: Date.now() - startedAt,
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
      throw err;
    }
  };

  return { emit, runStage };
}
