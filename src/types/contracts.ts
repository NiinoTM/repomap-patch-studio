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
  didNotFindAny: z.boolean().optional(),
  searchGuidance: z.string().optional(),
});

const CANDIDATE_LINE_REGEX = /^[-*]\s+([a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)\s*(?:[—–-]|:)\s*(.*)$/;

function extractDomainFromPath(filePath: string): string {
  const parts = filePath.split("/");
  if (parts.length > 2 && parts[0] === "src" && parts[1] === "features") {
    return parts[2];
  }
  return parts.length > 1 ? parts[parts.length - 2] : "core";
}

function parseCandidateLine(line: string): z.infer<typeof BlueprintDiscoveryCandidateSchema> | null {
  const match = line.match(CANDIDATE_LINE_REGEX);
  if (!match) return null;
  const filePath = match[1].trim();
  const reason = match[2]?.trim() || "Identified as prerequisite context for feature.";
  return { path: filePath, domain: extractDomainFromPath(filePath), reason };
}

function extractDiscoveryCandidates(lines: string[]): {
  candidates: z.infer<typeof BlueprintDiscoveryCandidateSchema>[];
  hasFilesNeededHeader: boolean;
} {
  const candidates: z.infer<typeof BlueprintDiscoveryCandidateSchema>[] = [];
  let hasFilesNeededHeader = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (/FILES NEEDED:/i.test(line)) {
      hasFilesNeededHeader = true;
      continue;
    }
    const candidate = parseCandidateLine(line);
    if (candidate) candidates.push(candidate);
  }

  return { candidates, hasFilesNeededHeader };
}

function parseTextDiscovery(text: string): z.infer<typeof BlueprintDiscoveryPayloadSchema> | null {
  const isNoFilesText = /didn'?t find any|no files found|no specific candidate files|search for files first/i.test(text);
  const { candidates, hasFilesNeededHeader } = extractDiscoveryCandidates(text.split("\n"));

  if (candidates.length === 0 && !hasFilesNeededHeader && !isNoFilesText) {
    return null;
  }

  const empty = candidates.length === 0;
  const summary = isNoFilesText && empty
    ? "No candidate files identified from the current context. Search for files first to seed discovery."
    : `Discovered ${candidates.length} candidate file(s) from architectural analysis.`;

  return {
    summary,
    candidates,
    suggestedPhases: [],
    didNotFindAny: empty,
    searchGuidance: empty
      ? "Didn't find any matching files. Search for files first or broaden discovery scope."
      : undefined,
  };
}

function cleanFencedInput(rawText: string): string {
  const trimmed = rawText.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```(?:json|context|text)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function parseDiscoveryInput(rawInput: unknown): { data?: unknown; error?: string } {
  if (typeof rawInput !== "string") return { data: rawInput };
  const cleanInput = cleanFencedInput(rawInput);
  try {
    return { data: JSON.parse(cleanInput) };
  } catch {
    const textResult = parseTextDiscovery(cleanInput);
    return textResult
      ? { data: textResult }
      : { error: "Failed to parse discovery JSON or candidate file list." };
  }
}

export function parseBlueprintDiscovery(rawInput: unknown): {
  success: boolean;
  data?: z.infer<typeof BlueprintDiscoveryPayloadSchema>;
  error?: string;
} {
  const parsed = parseDiscoveryInput(rawInput);
  if (parsed.error) {
    return { success: false, error: parsed.error };
  }

  const result = BlueprintDiscoveryPayloadSchema.safeParse(parsed.data);
  if (!result.success) {
    return {
      success: false,
      error: result.error.errors
        .map((err) => `${err.path.join(".")}: ${err.message}`)
        .join("; "),
    };
  }

  const payload = result.data;
  const isZeroCandidates = payload.candidates.length === 0;
  return {
    success: true,
    data: isZeroCandidates
      ? {
          ...payload,
          didNotFindAny: true,
          searchGuidance:
            payload.searchGuidance ||
            "Didn't find any matching files. Search for files first or broaden discovery scope.",
        }
      : payload,
  };
}