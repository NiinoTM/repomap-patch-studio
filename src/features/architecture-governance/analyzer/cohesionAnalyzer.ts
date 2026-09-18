import type { CohesionResult } from "../../../types/remediation";

interface SymbolBlock {
  name: string;
  body: string;
  references: Set<string>;
}

class DisjointSet {
  private parent: Map<string, string> = new Map();

  find(item: string): string {
    if (!this.parent.has(item)) this.parent.set(item, item);
    const p = this.parent.get(item)!;
    if (p !== item) {
      this.parent.set(item, this.find(p));
    }
    return this.parent.get(item)!;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) {
      this.parent.set(rootA, rootB);
    }
  }
}

function extractSymbols(content: string): SymbolBlock[] {
  const symbolRegex =
    /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)|(?:export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>|(?:export\s+)?class\s+([A-Za-z0-9_$]+)/g;

  const matches: Array<{ name: string; index: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = symbolRegex.exec(content)) !== null) {
    const name = m[1] || m[2] || m[3];
    if (name) matches.push({ name, index: m.index });
  }

  const symbols: SymbolBlock[] = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const nextIndex = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const body = content.slice(current.index, nextIndex);
    symbols.push({
      name: current.name,
      body,
      references: new Set<string>(),
    });
  }

  return symbols;
}

function populateReferences(symbols: SymbolBlock[]): void {
  const allNames = new Set(symbols.map((s) => s.name));

  for (const sym of symbols) {
    const identRegex = /\b([A-Za-z_$][A-Za-z0-9_$]*)\b/g;
    let match: RegExpExecArray | null;
    while ((match = identRegex.exec(sym.body)) !== null) {
      const token = match[1];
      if (token !== sym.name && allNames.has(token)) {
        sym.references.add(token);
      }
    }
  }
}

function computeConnectedComponents(symbols: SymbolBlock[]): string[][] {
  const dsu = new DisjointSet();
  for (const s of symbols) {
    dsu.find(s.name);
  }

  for (const s of symbols) {
    for (const ref of s.references) {
      dsu.union(s.name, ref);
    }
  }

  const groups = new Map<string, string[]>();
  for (const s of symbols) {
    const root = dsu.find(s.name);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(s.name);
  }

  return Array.from(groups.values());
}

export function analyzeModuleCohesion(file: string, content: string): CohesionResult {
  const symbols = extractSymbols(content);
  if (symbols.length <= 1) {
    return {
      file,
      lcom4: symbols.length,
      clusters: symbols.map((s) => [s.name]),
      isViolating: false,
    };
  }

  populateReferences(symbols);
  const clusters = computeConnectedComponents(symbols);
  const lcom4 = clusters.length;

  return {
    file,
    lcom4,
    clusters,
    isViolating: lcom4 >= 2,
  };
}