import { Router, Request, Response } from "express";
import { repoState, getGitHistory } from "../adapters/gitAdapter";

export const historyRouter = Router();

historyRouter.get("/history", (_req: Request, res: Response) => {
  try {
    const targetRepoPath = repoState.getRepoPath();
    const logs = getGitHistory(targetRepoPath);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.json({ success: true, logs: [] });
  }
});