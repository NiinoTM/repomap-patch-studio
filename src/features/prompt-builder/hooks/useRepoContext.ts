import { useState, useEffect, useCallback } from "react";
import { repoApi, historyApi } from "../../../api/client";
import { HistoryLog } from "../../../types";

export function useRepoContext() {
  const [repoPath, setRepoPath] = useState<string>("Loading...");
  const [repoFiles, setRepoFiles] = useState<string[]>([]);
  const [repoMap, setRepoMap] = useState<string>("");
  const [fileStats, setFileStats] = useState<
    Record<string, { size: number; tokens: number }>
  >({});
  const [dependencyMap, setDependencyMap] = useState<{
    outbound: Record<string, string[]>;
    inbound: Record<string, string[]>;
    apiOutbound?: Record<string, string[]>;
    apiInbound?: Record<string, string[]>;
  }>({ outbound: {}, inbound: {} });
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await historyApi.fetchHistory();
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Failed to fetch git history:", err);
    }
  }, []);

  const loadRepo = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await repoApi.fetchRepo();
      if (data.success) {
        setRepoPath(data.path);
        setRepoFiles(data.files);
        setRepoMap(data.repoMap);
        setFileStats(data.fileStats || {});
        setDependencyMap(data.dependencyMap || { outbound: {}, inbound: {} });
      }
    } catch (err) {
      console.error("Failed to fetch repo context:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRepo();
    fetchHistory();
  }, [loadRepo, fetchHistory]);

  const changeRepo = async (newPath: string): Promise<boolean> => {
    if (!newPath || newPath === repoPath) return false;

    try {
      const data = await repoApi.changeRepo(newPath);
      if (data.success) {
        setRepoPath(data.path);
        setRepoFiles(data.files);
        setRepoMap(data.repoMap);
        setFileStats(data.fileStats || {});
        setDependencyMap(data.dependencyMap || { outbound: {}, inbound: {} });
        fetchHistory();
        return true;
      } else {
        alert("Error: " + (data.error || "Failed to change repository path"));
        return false;
      }
    } catch (err) {
      alert("Failed to update repository path. Ensure backend is running.");
      return false;
    }
  };

  return {
    repoPath,
    repoFiles,
    repoMap,
    fileStats,
    dependencyMap,
    logs,
    isLoading,
    changeRepo,
    refreshHistory: fetchHistory,
  };
}