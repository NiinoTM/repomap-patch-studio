import React from "react";
import { createPortal } from "react-dom";
import { FileText } from "lucide-react";
import { FuzzyResult } from "../../utils/fuzzySearch";

interface MentionDropdownProps {
  mentionQuery: string | null;
  mentionMatches: FuzzyResult[];
  mentionPos: {
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    direction: "up" | "down";
  } | null;
  activeMentionIndex: number;
  selectedFiles: Set<string>;
  mentionPopupRef: React.RefObject<HTMLDivElement | null>;
  onInsertMention: (filePath: string) => void;
  onHoverMention: (index: number) => void;
}

export function MentionDropdown({
  mentionQuery,
  mentionMatches,
  mentionPos,
  activeMentionIndex,
  selectedFiles,
  mentionPopupRef,
  onInsertMention,
  onHoverMention,
}: MentionDropdownProps) {
  if (mentionQuery === null || mentionMatches.length === 0 || !mentionPos) {
    return null;
  }

  const renderFuzzyPath = (result: FuzzyResult) => {
    const dirLen = result.dirPath ? result.dirPath.length + 1 : 0;
    const dirChars = result.filePath.slice(0, dirLen).split("");
    const fileChars = result.filePath.slice(dirLen).split("");

    const renderChars = (chars: string[], offset: number) =>
      chars.map((char, i) => {
        const idx = offset + i;
        const isMatched = result.matchedIndices.has(idx);
        return (
          <span
            key={idx}
            className={
              isMatched
                ? "text-cyan-400 font-bold bg-cyan-950/60 rounded-[1px]"
                : "text-zinc-400"
            }
          >
            {char}
          </span>
        );
      });

    return (
      <span className="font-mono text-xs flex items-center min-w-0">
        {dirChars.length > 0 && (
          <span
            className="overflow-hidden whitespace-nowrap text-ellipsis shrink"
            style={{ direction: "rtl", textAlign: "left" }}
            title={result.dirPath}
          >
            {renderChars(dirChars, 0)}
          </span>
        )}
        <span className="whitespace-nowrap shrink-0">
          {renderChars(fileChars, dirLen)}
        </span>
      </span>
    );
  };

  return createPortal(
    <div
      ref={mentionPopupRef}
      className="fixed bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-[100] flex flex-col"
      style={{
        left: mentionPos.left,
        width: mentionPos.width,
        maxHeight: mentionPos.maxHeight,
        top: mentionPos.direction === "down" ? mentionPos.top : undefined,
        bottom:
          mentionPos.direction === "up"
            ? window.innerHeight - mentionPos.top
            : undefined,
      }}
    >
      <div className="p-1.5 bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 font-medium flex justify-between shrink-0">
        <span>Fuzzy Matches for "@{mentionQuery}"</span>
        <span className="text-zinc-600">
          ↑↓ to navigate, Enter to select
        </span>
      </div>
      <div className="overflow-y-auto custom-scrollbar">
        {mentionMatches.map((res, idx) => (
          <div
            key={res.filePath}
            onClick={() => onInsertMention(res.filePath)}
            onMouseEnter={() => onHoverMention(idx)}
            className={`px-3 py-1.5 text-xs flex items-center justify-between cursor-pointer transition-colors gap-2 ${
              idx === activeMentionIndex
                ? "bg-cyan-600/30 text-cyan-200 border-l-2 border-cyan-500"
                : "text-zinc-300 hover:bg-zinc-800/50"
            }`}
          >
            <div className="flex items-center min-w-0 flex-1">
              <FileText className="w-3.5 h-3.5 mr-2 text-zinc-400 shrink-0" />
              {renderFuzzyPath(res)}
            </div>
            {selectedFiles.has(res.filePath) && (
              <span className="text-[9px] bg-cyan-500/20 text-cyan-400 font-mono px-1 py-0.5 rounded border border-cyan-500/30 shrink-0">
                Added
              </span>
            )}
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}