import ts from "typescript";
import {
  readTextFile,
  fileExists,
  isDirectory,
  resolvePath,
  extnamePath,
} from "../adapters/fsAdapter";

function hasExportModifier(node: ts.Node): boolean {
  if ((ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0) {
    return true;
  }
  const modifiers = (node as { modifiers?: readonly ts.Modifier[] }).modifiers;
  return Boolean(modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
}

function formatFunctionDeclaration(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): string {
  if (!node.body) {
    const text = node.getText(sourceFile).trim();
    return text.endsWith(";") ? text : `${text};`;
  }
  const fullText = node.getText(sourceFile);
  const bodyStart = node.body.getStart(sourceFile) - node.getStart(sourceFile);
  const signature = fullText.slice(0, bodyStart).trim();
  return signature.endsWith(";") ? signature : `${signature};`;
}

function formatArrowOrFunction(name: string, fn: ts.ArrowFunction | ts.FunctionExpression): string {
  const params = fn.parameters.map((p) => p.getText()).join(", ");
  const retType = fn.type ? fn.type.getText().trim() : "unknown";
  return `export const ${name}: (${params}) => ${retType};`;
}

function formatSingleDeclaration(decl: ts.VariableDeclaration): string {
  const name = decl.name.getText();
  if (decl.type) {
    return `export const ${name}: ${decl.type.getText().trim()};`;
  }
  const init = decl.initializer;
  if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
    return formatArrowOrFunction(name, init);
  }
  const initText = init ? init.getText().trim() : "";
  const isShortLiteral = initText.length > 0 && initText.length < 50 && !initText.includes("\n");
  return isShortLiteral ? `export const ${name} = ${initText};` : `export const ${name}: unknown;`;
}

function formatVariableStatement(node: ts.VariableStatement): string[] {
  if (!hasExportModifier(node)) return [];
  return node.declarationList.declarations.map(formatSingleDeclaration);
}

function formatClassMethod(member: ts.MethodDeclaration): string | null {
  if (!member.name) return null;
  const methodName = member.name.getText();
  const params = member.parameters.map((p) => p.getText()).join(", ");
  const ret = member.type ? `: ${member.type.getText().trim()}` : "";
  return `  ${methodName}(${params})${ret};`;
}

function formatClassProperty(member: ts.PropertyDeclaration): string | null {
  if (!member.name) return null;
  const propName = member.name.getText();
  const propType = member.type ? `: ${member.type.getText().trim()}` : "";
  return `  ${propName}${propType};`;
}

function isPrivateMember(member: ts.ClassElement): boolean {
  const modifiers = ts.canHaveModifiers?.(member)
    ? ts.getModifiers(member)
    : (member as { modifiers?: ts.NodeArray<ts.Modifier> }).modifiers;
  return Boolean(modifiers?.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword));
}

function formatClassMember(member: ts.ClassElement): string | null {
  if (isPrivateMember(member)) return null;
  if (ts.isMethodDeclaration(member)) return formatClassMethod(member);
  if (ts.isPropertyDeclaration(member)) return formatClassProperty(member);
  if (ts.isConstructorDeclaration(member)) {
    const params = member.parameters.map((p) => p.getText()).join(", ");
    return `  constructor(${params});`;
  }
  return null;
}

function formatClassDeclaration(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): string {
  const name = node.name ? node.name.getText(sourceFile) : "AnonymousClass";
  const heritage = node.heritageClauses
    ? ` ${node.heritageClauses.map((h) => h.getText(sourceFile)).join(" ")}`
    : "";
  const prefix = hasExportModifier(node) ? "export " : "";
  const members = node.members
    .map((m) => formatClassMember(m))
    .filter((m): m is string => Boolean(m));

  if (members.length === 0) {
    return `${prefix}class ${name}${heritage} {}`;
  }
  return `${prefix}class ${name}${heritage} {\n${members.join("\n")}\n}`;
}

function extractExportedDeclaration(
  statement: ts.Statement,
  sourceFile: ts.SourceFile
): string | string[] | null {
  if (
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isEnumDeclaration(statement)
  ) {
    return statement.getText(sourceFile).trim();
  }
  if (ts.isFunctionDeclaration(statement)) {
    return formatFunctionDeclaration(statement, sourceFile);
  }
  if (ts.isClassDeclaration(statement)) {
    return formatClassDeclaration(statement, sourceFile);
  }
  if (ts.isVariableStatement(statement)) {
    return formatVariableStatement(statement);
  }
  return null;
}

function extractStatementSignature(
  statement: ts.Statement,
  sourceFile: ts.SourceFile
): string | string[] | null {
  if (ts.isExportDeclaration(statement) || ts.isExportAssignment(statement)) {
    return statement.getText(sourceFile).trim();
  }
  if (!hasExportModifier(statement)) {
    return null;
  }
  return extractExportedDeclaration(statement, sourceFile);
}

function isSupportedScriptFile(filePath: string): boolean {
  const ext = extnamePath(filePath).toLowerCase();
  return [".ts", ".tsx", ".js", ".jsx", ".d.ts", ""].includes(ext);
}

function resolveScriptKind(filePath: string): ts.ScriptKind {
  const ext = extnamePath(filePath).toLowerCase();
  if (ext.includes("tsx") || ext.includes("jsx")) {
    return ts.ScriptKind.TSX;
  }
  return ts.ScriptKind.TS;
}

function collectStatementSignatures(sourceFile: ts.SourceFile): string[] {
  const signatures: string[] = [];
  for (const statement of sourceFile.statements) {
    const sig = extractStatementSignature(statement, sourceFile);
    if (Array.isArray(sig)) {
      signatures.push(...sig);
    } else if (sig) {
      signatures.push(sig);
    }
  }
  return signatures;
}

export function extractFileExportContracts(content: string, filePath: string): string {
  if (!content?.trim()) return "";
  if (!isSupportedScriptFile(filePath)) return "";

  try {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      resolveScriptKind(filePath)
    );
    return collectStatementSignatures(sourceFile).join("\n\n");
  } catch {
    return "";
  }
}

export async function extractExportContracts(
  repoPath: string,
  filePaths: string[]
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  const resolvedRoot = resolvePath(repoPath);

  for (const relPath of filePaths) {
    try {
      const normalized = relPath.replace(/^[/\\]+/, "");
      const absPath = resolvePath(resolvedRoot, normalized);

      if (!absPath.startsWith(resolvedRoot)) continue;
      if (!fileExists(absPath) || isDirectory(absPath)) continue;

      const content = readTextFile(absPath);
      const extracted = extractFileExportContracts(content, normalized);
      if (extracted.trim()) {
        results[normalized] = extracted;
      }
    } catch {
      // Ignore unreadable or corrupted files
    }
  }

  return results;
}