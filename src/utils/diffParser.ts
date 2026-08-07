import { DiffBlock } from '../types';

export function parseDiffBlocks(rawText: string): DiffBlock[] {
  if (!rawText) return [];

  // 1. Normalize Windows \r\n line endings to standard Unix \n
  let text = rawText.replace(/\r\n/g, '\n');

  const blocks: DiffBlock[] = [];
  let index = 1;

  // 2. PARSER A: Match SEARCH / REPLACE blocks
  // Matches:
  // FILE: path/to/file.ext
  // <<<<<<< SEARCH
  // [search content]
  // =======
  // [replace content]
  // >>>>>>> REPLACE
  const searchReplaceRegex = /(?:FILE:\s*|OVERWRITE FILE:\s*|path=")?([^\n\r"]+)"?\s*\n(?:```[a-zA-Z]*\n)?<{3,}\s*SEARCH\n([\s\S]*?)\n={3,}\n([\s\S]*?)\n>{3,}\s*REPLACE(?:\n```)?/gi;

  let match;
  while ((match = searchReplaceRegex.exec(text)) !== null) {
    let filePath = match[1].trim().replace(/^["']|["']$/g, '');
    filePath = filePath.replace(/^FILE:\s*/i, '').replace(/^OVERWRITE FILE:\s*/i, '').trim();

    const searchContent = match[2];
    const replaceContent = match[3];

    blocks.push({
      id: String(index++),
      file: filePath,
      status: 'match',
      search: searchContent,
      replace: replaceContent
    });
  }

  // 3. PARSER B: Match "Create 'path/to/file'" or "Create path/to/file" blocks
  // Matches:
  // Create 'path/to/file.ext':
  // ```typescript
  // [content]
  // ```
  const createRegex = /(?:Create|Overwriting)\s+['"]?([^'":\n\r]+)['"]?:\s*\n```[a-zA-Z]*\n([\s\S]*?)\n```/gi;

  while ((match = createRegex.exec(text)) !== null) {
    const filePath = match[1].trim();
    const replaceContent = match[2];

    if (!blocks.some(b => b.file === filePath && b.replace === replaceContent)) {
      blocks.push({
        id: String(index++),
        file: filePath,
        status: 'match',
        search: '', // Empty search indicates new file or total overwrite
        replace: replaceContent
      });
    }
  }

  return blocks;
}