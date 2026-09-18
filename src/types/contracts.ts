import { z } from "zod";
import type { StructuredBlueprint } from "./remediation";

export const SubpathExportConfigSchema = z.object({
  rootEntry: z.string().default("./src/index.ts"),
  featureBarrels: z.record(z.string()),
  styleEntries: z.array(z.string()).default(["./src/index.css"]),
});

export const TsPathFenceConfigSchema = z.object({
  baseUrl: z.string().default("."),
  strictAliases: z.record(z.array(z.string())),
  disallowedPatterns: z.array(z.string()),
});

export const DomainLayerTypeSchema = z.enum([
  "feature",
  "server-service",
  "server-adapter",
  "api",
  "utils",
]);

export const DomainContractDefinitionSchema = z.object({
  name: z.string().min(1, "Domain name is required"),
  layer: DomainLayerTypeSchema,
  description: z.string().default(""),
  publicExports: z.array(z.string()).default([]),
  privateModules: z.array(z.string()).default([]),
  allowedDependencies: z.array(z.string()).default([]),
});

export const BlueprintTargetFileSchema = z.object({
  path: z.string().min(1, "File path is required"),
  domain: z.string().min(1, "Domain name is required"),
  responsibility: z.string().min(1, "Responsibility description is required"),
});

export const BlueprintPhaseSchema = z.object({
  id: z.string().min(1, "Phase id is required"),
  name: z.string().min(1, "Phase name is required"),
  intent: z.string().default(""),
  files: z.array(BlueprintTargetFileSchema).default([]),
  verificationCriteria: z.array(z.string()).default([]),
});

export const StructuredBlueprintSchema = z
  .object({
    title: z.string().default("Architectural Blueprint"),
    summary: z.string().default(""),
    domains: z
      .array(DomainContractDefinitionSchema)
      .min(1, "At least one domain must be defined"),
    phases: z.array(BlueprintPhaseSchema).default([]),
    targetFiles: z.array(BlueprintTargetFileSchema).default([]),
  })
  .transform((data) => {
    // Single Source of Truth: derive targetFiles from inlined phases when empty
    if (data.phases.length > 0 && data.targetFiles.length === 0) {
      return {
        ...data,
        targetFiles: data.phases.flatMap((p) => p.files),
      };
    }
    // Backward compatibility: synthesize fallback phase for legacy flat blueprints
    if (data.targetFiles.length > 0 && data.phases.length === 0) {
      return {
        ...data,
        phases: [
          {
            id: "phase-1",
            name: "Phase 1: Implementation",
            intent: "Execute target file changes",
            files: data.targetFiles,
            verificationCriteria: ["Zero syntax diagnostics"],
          },
        ],
      };
    }
    return data;
  });

export const GovernanceScaffoldOptionsSchema = z.object({
  eslintSizeLimits: z.boolean().default(true),
  eslintLayerBoundaries: z.boolean().default(true),
  huskyPreCommitHook: z.boolean().default(true),
  huskyLeakedMarkerCheck: z.boolean().default(true),
  telemetryDbMonitoring: z.boolean().default(false),
  featurePublicApiBarrier: z.boolean().default(true),
  strictSubpathExports: z.boolean().optional().default(true),
  knipDeadCodeDetection: z.boolean().default(true),
  dpdmCircularCheck: z.boolean().default(true),
  strictAsyncSafety: z.boolean().default(true),
  featureDirectorySkeleton: z.boolean().default(true),
  autoInstallDependencies: z.boolean().default(true),
  zodRuntimeContracts: z.boolean().default(true),
  vitestUnitTesting: z.boolean().default(false),
  playwrightCriticalFlows: z.boolean().default(false),
  softTechnicalDebtMode: z.boolean().default(false),
});

// Runtime Boundary Validation Helper
export function parseStructuredBlueprint(rawInput: unknown): {
  success: boolean;
  data?: StructuredBlueprint;
  error?: string;
} {
  let dataToParse = rawInput;
  if (typeof rawInput === "string") {
    let cleanInput = rawInput.trim();
    if (cleanInput.startsWith("```")) {
      cleanInput = cleanInput
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
    }
    try {
      dataToParse = JSON.parse(cleanInput);
    } catch (e) {
      return {
        success: false,
        error: `Failed to parse blueprint JSON: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  const result = StructuredBlueprintSchema.safeParse(dataToParse);
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("; "),
    };
  }

  return {
    success: true,
    data: result.data as StructuredBlueprint,
  };
}

export const BlueprintDiscoveryCandidateSchema = z.object({
  path: z.string().min(1, "Candidate file path is required"),
  domain: z.string().min(1, "Domain name is required"),
  reason: z.string().min(1, "Discovery reason is required"),
  layer: DomainLayerTypeSchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const BlueprintDiscoveryPayloadSchema = z.object({
  summary: z.string().default(""),
  candidates: z.array(BlueprintDiscoveryCandidateSchema).default([]),
  suggestedPhases: z.array(z.string()).default([]),
});

export function parseBlueprintDiscovery(rawInput: unknown): {
  success: boolean;
  data?: z.infer<typeof BlueprintDiscoveryPayloadSchema>;
  error?: string;
} {
  let dataToParse = rawInput;
  if (typeof rawInput === "string") {
    let cleanInput = rawInput.trim();
    if (cleanInput.startsWith("```")) {
      cleanInput = cleanInput
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
    }
    try {
      dataToParse = JSON.parse(cleanInput);
    } catch (e) {
      return {
        success: false,
        error: `Failed to parse discovery JSON: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  const result = BlueprintDiscoveryPayloadSchema.safeParse(dataToParse);
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("; "),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}