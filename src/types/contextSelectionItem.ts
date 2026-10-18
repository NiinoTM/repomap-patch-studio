import { z } from "zod";

export const ContextSelectionFileSchema = z.object({
  type: z.literal("file"),
  path: z.string().min(1, "File path is required"),
});

export const ContextSelectionRangeSchema = z.object({
  type: z.literal("range"),
  path: z.string().min(1, "File path is required"),
  start: z.number().int().positive("Start line must be a positive integer"),
  end: z.number().int().positive("End line must be a positive integer"),
});

export const ContextSelectionSymbolSchema = z.object({
  type: z.literal("symbol"),
  path: z.string().min(1, "File path is required"),
  symbol: z.string().min(1, "Symbol identifier is required"),
});

export const ContextSelectionItemSchema = z.discriminatedUnion("type", [
  ContextSelectionFileSchema,
  ContextSelectionRangeSchema,
  ContextSelectionSymbolSchema,
]);

export type ContextSelectionItem = z.infer<typeof ContextSelectionItemSchema>;

export function getContextItemKey(item: ContextSelectionItem): string {
  switch (item.type) {
    case "file":
      return item.path;
    case "range":
      return `${item.path}:[${item.start}-${item.end}]`;
    case "symbol":
      return `${item.path}#${item.symbol}`;
  }
}

export function serializeContextItemToDirective(item: ContextSelectionItem): string {
  switch (item.type) {
    case "file":
      return item.path;
    case "range":
      return `READ: '${item.path}:[${item.start}-${item.end}]'`;
    case "symbol":
      return `INSPECT: '${item.symbol}' IN '${item.path}'`;
  }
}