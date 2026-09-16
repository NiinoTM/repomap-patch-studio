import { useState, useCallback } from "react";
import { repoApi } from "../../../api/repoApi";
import { patchApi } from "../../../api/patchApi";
import { DiffBlock } from "../../../types/patch";
import { FeatureBlueprintDomain, RefactorStep, ProposedFileMove } from "../../../types/remediation";
import { clusterDomains } from "../analyzer/domainClusterEngine";
import { scanBoundaryViolations, BoundaryViolation } from "../analyzer/boundaryViolationScanner";

export interface UseArchitectureRefactorReturn {
  refactorStep: RefactorStep;
  blueprint: FeatureBlueprintDomain[];
  selectedMoveIds: Set<string>;
  violations: BoundaryViolation[];
  toggleMoveSelection: (id: string) => void;
  handleAnalyzeProject: () => Promise<void>;
  handleExecuteSelectedMoves: () => Promise<void>;
  resetRefactorState: () => void;
}

function buildMoveBlocks(approvedMoves: ProposedFileMove[]): DiffBlock[] {
  return approvedMoves.map((m) => ({
    id: `move-${m.id}`,
    file: m.sourcePath,
    moveTo: m.targetPath,
    type: "move",
    changeType: "MOVE",
    search: "",
    replace: "",
    status: "match",
  }));
}

export function useArchitectureRefactor(): UseArchitectureRefactorReturn {
  const [refactorStep, setRefactorStep] = useState<RefactorStep>("idle");
  const [blueprint, setBlueprint] = useState<FeatureBlueprintDomain[]>([]);
  const [violations, setViolations] = useState<BoundaryViolation[]>([]);
  const [selectedMoveIds, setSelectedMoveIds] = useState<Set<string>>(new Set());

  const toggleMoveSelection = (id: string) => {
    setSelectedMoveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAnalyzeProject = useCallback(async () => {
    setRefactorStep("analyzing");
    try {
      const repoData = await repoApi.fetchRepo();
      if (!repoData.success) {
        alert(`❌ Failed to scan workspace: ${repoData.error || "Unknown error"}`);
        setRefactorStep("idle");
        return;
      }

      const foundViolations = scanBoundaryViolations({
        files: repoData.files,
        dependencyMap: repoData.dependencyMap || { outbound: {}, inbound: {} },
        fileStats: repoData.fileStats,
      });
      setViolations(foundViolations);

      const clustered = clusterDomains(repoData.files, repoData.dependencyMap || { outbound: {}, inbound: {} });
      setBlueprint(clustered);

      const allIds = new Set<string>();
      clustered.forEach((d) => d.filesToMove.forEach((m) => allIds.add(m.id)));
      setSelectedMoveIds(allIds);

      setRefactorStep("blueprint-ready");
    } catch (err) {
      console.error("Error analyzing architecture:", err);
      setRefactorStep("idle");
    }
  }, []);

  const handleExecuteSelectedMoves = useCallback(async () => {
    setRefactorStep("executing");
    try {
      const approvedMoves = blueprint
        .flatMap((d) => d.filesToMove)
        .filter((m) => selectedMoveIds.has(m.id));

      if (approvedMoves.length === 0) {
        alert("No moves selected for execution.");
        setRefactorStep("blueprint-ready");
        return;
      }

      const blocks = buildMoveBlocks(approvedMoves);
      const res = await patchApi.applyStream(
        {
          blocks,
          commitMessage: `refactor(arch): migrate ${approvedMoves.length} files to feature domains`,
          skipCommit: true,
          commit: false,
        },
        () => {},
      );

      if (!res.success) {
        alert(`❌ Failed to execute moves: ${res.error || "Unknown error"}`);
        setRefactorStep("blueprint-ready");
        return;
      }

      setRefactorStep("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`❌ Error executing architecture refactor: ${msg}`);
      setRefactorStep("blueprint-ready");
    }
  }, [blueprint, selectedMoveIds]);

  const resetRefactorState = () => {
    setRefactorStep("idle");
    setBlueprint([]);
    setViolations([]);
    setSelectedMoveIds(new Set());
  };

  return {
    refactorStep,
    blueprint,
    selectedMoveIds,
    violations,
    toggleMoveSelection,
    handleAnalyzeProject,
    handleExecuteSelectedMoves,
    resetRefactorState,
  };
}