import ts from "typescript";
import { extnamePath } from "../adapters/fsAdapter";

export function isSupportedScriptFile(filePath: string): boolean {
  const ext = extnamePath(filePath).toLowerCase();
  return [".ts", ".tsx", ".js", ".jsx", ".d.ts", ""].includes(ext);
}

export function resolveScriptKind(filePath: string): ts.ScriptKind {
  const ext = extnamePath(filePath).toLowerCase();
  if (ext.includes("tsx") || ext.includes("jsx")) {
    return ts.ScriptKind.TSX;
  }
  return ts.ScriptKind.TS;
}

const DECLARATION_KINDS = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.TypeAliasDeclaration,
  ts.SyntaxKind.EnumDeclaration,
  ts.SyntaxKind.ModuleDeclaration,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.PropertyDeclaration,
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.PropertySignature,
  ts.SyntaxKind.PropertyAssignment,
  ts.SyntaxKind.VariableDeclaration,
]);

function isNamedDeclarationNode(node: ts.Node): boolean {
  return DECLARATION_KINDS.has(node.kind);
}

function getNodeName(node: ts.Node, sourceFile: ts.SourceFile): string | null {
  if (!isNamedDeclarationNode(node)) return null;
  const named = node as { name?: ts.Node };
  return named.name ? named.name.getText(sourceFile) : null;
}

function resolveTargetNode(node: ts.Node): ts.Node {
  if (ts.isVariableDeclaration(node)) {
    const parentStatement = node.parent?.parent;
    if (
      parentStatement &&
      ts.isVariableStatement(parentStatement) &&
      parentStatement.declarationList.declarations.length === 1
    ) {
      return parentStatement;
    }
  }
  return node;
}

function findSymbolNode(sourceFile: ts.SourceFile, symbolName: string): ts.Node | null {
  let matchNode: ts.Node | null = null;

  function visit(node: ts.Node): boolean {
    if (getNodeName(node, sourceFile) === symbolName) {
      matchNode = resolveTargetNode(node);
      return true;
    }
    return ts.forEachChild(node, visit) ?? false;
  }

  visit(sourceFile);
  return matchNode;
}

function extractNodeText(sourceFile: ts.SourceFile, targetNode: ts.Node): string {
  const commentRanges = ts.getLeadingCommentRanges(sourceFile.text, targetNode.pos);
  const startPos =
    commentRanges && commentRanges.length > 0
      ? commentRanges[0].pos
      : targetNode.getStart(sourceFile, true);
  return sourceFile.text.slice(startPos, targetNode.getEnd()).trim();
}

export function extractSymbolBody(
  content: string,
  filePath: string,
  symbolName: string
): string | null {
  if (!content?.trim() || !symbolName?.trim() || !isSupportedScriptFile(filePath)) {
    return null;
  }

  try {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      resolveScriptKind(filePath)
    );

    const matchNode = findSymbolNode(sourceFile, symbolName);
    return matchNode ? extractNodeText(sourceFile, matchNode) : null;
  } catch {
    return null;
  }
}

export function extractLineRange(
  content: string,
  startLine: number,
  endLine: number,
  filePath?: string
): string {
  if (!content) return "";
  const lines = content.split(/\r?\n/);
  const total = lines.length;
  if (total === 0) return "";

  const minReq = Math.min(startLine, endLine);
  const maxReq = Math.max(startLine, endLine);
  const start = Math.max(1, Math.min(minReq, total));
  const end = Math.max(start, Math.min(maxReq, total));
  const slice = lines.slice(start - 1, end).join("\n");
  const fileLabel = filePath ? ` in ${filePath}` : "";
  return `// --- Lines ${start}-${end} of ${total}${fileLabel} ---\n${slice}`;
}