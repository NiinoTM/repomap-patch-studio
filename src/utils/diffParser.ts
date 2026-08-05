// src/utils/diffParser.ts
import { DiffBlock } from '../types';

export function parseDiffBlocks(rawText: string): DiffBlock[] {
  // 1. Clean up markdown code fences if Gemini wrapped the output in ```tsx ... ```
  let text = rawText.replace(/```[a-zA-Z]*\n/g, '').replace(/```/g, '');

  const blocks: DiffBlock[] = [];
  let index = 1;

  // 2. BULLETPROOF REGEX: Matches both 3+ chevrons (<<<< SEARCH) AND XML tags (<search>)
  const blockRegex = /(?:FILE:\s*|OVERWRITE FILE:\s*|path=")?([^\n\r"]+)"?\s*\n(?:<{3,}\s*SEARCH|<search>)\n([\s\S]*?)\n(?:={3,}|<\/search>\s*<replace>)\n([\s\S]*?)\n(?:>{3,}\s*REPLACE|<\/replace>)/gi;

  let match;
  while ((match = blockRegex.exec(text)) !== null) {
    const filePath = match[1].trim().replace(/^["']|["']$/g, '');
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

  return blocks;
}