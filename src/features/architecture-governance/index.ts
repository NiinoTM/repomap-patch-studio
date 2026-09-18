export { GovernanceDashboardModal } from "./components/GovernanceDashboardModal";
export { ArchitectureRefactorTab } from "./components/tabs/ArchitectureRefactorTab";
export { GuardrailsPatcherTab } from "./components/tabs/GuardrailsPatcherTab";
export {
  useArchitectureRefactor,
  type UseArchitectureRefactorReturn,
} from "./hooks/useArchitectureRefactor";
export {
  useGovernancePatcher,
  type UseGovernancePatcherReturn,
} from "./hooks/useGovernancePatcher";
export {
  scanBoundaryViolations,
  type BoundaryViolation,
} from "./analyzer/boundaryViolationScanner";
export {
  analyzeModuleCohesion,
} from "./analyzer/cohesionAnalyzer";
export {
  clusterDomains,
  proposeCohesionSplits,
} from "./analyzer/domainClusterEngine";
export { generateGovernancePatchBlocks } from "./patchers/governancePatchGenerator";
export { patchPackageJson } from "./patchers/packageJsonPatcher";
export { patchTsConfig } from "./patchers/tsConfigPatcher";
export { patchEslintConfig } from "./patchers/eslintBoundaryPatcher";
export * from "./patchers/governanceAuxTemplates";