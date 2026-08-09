import { RefObject, useEffect, useRef } from "react";
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
  mentionPopupRef: RefObject<HTMLDivElement>;
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
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[
        activeMentionIndex
      ] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeMentionIndex]);

  if (mentionQuery === null || !mentionPos || mentionMatches.length === 0) {
    return null;
  }

  const renderChars = (chars: string[], offset: number, matches: number[]) => {
    return chars.map((char, i) => {
      const globalIndex = offset + i;
      const isMatched = matches.includes(globalIndex);
      return isMatched ? (
        <span
          key={i}
          className="text-cyan-400 font-bold bg-cyan-500/20 rounded-[2px]"
        >
          {char}
        </span>
      ) : (
        <span key={i}>{char}</span>
      );
    });
  };

  const renderFuzzyPath = (result: FuzzyResult) => {
    const lastSlash = result.filePath.lastIndexOf("/");

    let dir = "";
    let file = result.filePath;
    const dirOffset = 0;
    let fileOffset = 0;

    if (lastSlash !== -1) {
      // By slicing up to lastSlash + 1, we INCLUDE the '/' character in the directory string.
      // This fixes the bug where the slash was being omitted from the rendered results!
      dir = result.filePath.slice(0, lastSlash + 1);
      file = result.filePath.slice(lastSlash + 1);
      fileOffset = lastSlash + 1;
    }

    return (
      <span className="flex truncate w-full text-left items-center">
        {dir && (
          <span className="opacity-50 truncate flex-shrink">
            {renderChars(dir.split(""), dirOffset, result.matches)}
          </span>
        )}
        <span className="font-medium text-zinc-300 flex-shrink-0">
          {renderChars(file.split(""), fileOffset, result.matches)}
        </span>
      </span>
    );
  };

  return (
    <div
      ref={mentionPopupRef}
      className="fixed z-50 bg-zinc-900 border border-zinc-700 shadow-2xl rounded-lg overflow-hidden flex flex-col"
      style={{
        top: mentionPos.top,
        left: mentionPos.left,
        width: Math.min(mentionPos.width, 600),
        maxHeight: mentionPos.maxHeight,
        transform: mentionPos.direction === "up" ? "translateY(-100%)" : "none",
      }}
    >
      <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">
          Fuzzy Matches for{" "}
          <span className="text-cyan-400">"@{mentionQuery}"</span>
        </span>
        <span className="text-[10px] text-zinc-500 flex items-center">
          <span className="mr-1">↑↓</span> to navigate, Enter to select
        </span>
      </div>
      <ul
        ref={listRef}
        className="overflow-y-auto custom-scrollbar flex-1 py-1"
      >
        {mentionMatches.map((match, i) => {
          const isActive = i === activeMentionIndex;
          const isSelected = selectedFiles.has(match.filePath);

          return (
            <li
              key={match.filePath}
              className={`px-3 py-2 cursor-pointer flex items-center space-x-3 transition-colors ${
                isActive ? "bg-cyan-500/10" : "hover:bg-zinc-800/50"
              }`}
              onMouseEnter={() => onHoverMention(i)}
              onClick={() => onInsertMention(match.filePath)}
            >
              <FileText
                className={`w-4 h-4 shrink-0 ${
                  isActive ? "text-cyan-400" : "text-zinc-500"
                }`}
              />
              <div className="flex-1 min-w-0 font-mono text-[13px] truncate flex items-center justify-between">
                {renderFuzzyPath(match)}
                {isSelected && (
                  <span className="ml-3 text-[10px] px-1.5 py-0.5 rounded border border-cyan-500/30 text-cyan-400 bg-cyan-500/10 shrink-0 flex items-center space-x-1">
                    <span>Added</span>
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
