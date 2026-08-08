import { useState, useEffect, useMemo, useRef, ChangeEvent, KeyboardEvent } from "react";
import { fuzzySearchFiles } from "../utils/fuzzySearch";

interface UseMentionPopupProps {
  request: string;
  files: string[];
  setRequest: (value: string) => void;
  onAddSeedFile: (filePath: string) => void;
}

export function useMentionPopup({
  request,
  files,
  setRequest,
  onAddSeedFile,
}: UseMentionPopupProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mentionPopupRef = useRef<HTMLDivElement | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [activeMentionIndex, setActiveMentionIndex] = useState<number>(0);
  const [mentionPos, setMentionPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    direction: "up" | "down";
  } | null>(null);

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    return fuzzySearchFiles(files, mentionQuery);
  }, [files, mentionQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        mentionPopupRef.current &&
        !mentionPopupRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setMentionQuery(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mentionQuery === null || !textareaRef.current) {
      setMentionPos(null);
      return;
    }

    const MARGIN = 8;
    const MAX_PANEL_HEIGHT = 260;
    const MIN_PANEL_HEIGHT = 120;

    const updatePosition = () => {
      const rect = textareaRef.current?.getBoundingClientRect();
      if (!rect) return;

      const spaceAbove = rect.top - MARGIN;
      const spaceBelow = window.innerHeight - rect.bottom - MARGIN;
      const openUp = spaceAbove >= 160 || spaceAbove >= spaceBelow;

      const maxHeight = Math.min(
        MAX_PANEL_HEIGHT,
        Math.max(MIN_PANEL_HEIGHT, (openUp ? spaceAbove : spaceBelow) - MARGIN),
      );

      setMentionPos({
        top: openUp ? rect.top - MARGIN : rect.bottom + MARGIN,
        left: rect.left,
        width: rect.width,
        maxHeight,
        direction: openUp ? "up" : "down",
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [mentionQuery, mentionMatches.length]);

  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setRequest(value);

    const textBeforeCursor = value.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_\-./]*)$/);

    if (match) {
      setMentionQuery(match[1]);
      setMentionStartIndex(cursorPos - match[0].length);
      setActiveMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (filePath: string) => {
    if (mentionStartIndex < 0 || !textareaRef.current) return;

    const cursorPos = textareaRef.current.selectionStart;
    const before = request.slice(0, mentionStartIndex);
    const after = request.slice(cursorPos);

    const newText = `${before}@${filePath} ${after}`;
    setRequest(newText);

    onAddSeedFile(filePath);
    setMentionQuery(null);

    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStartIndex + filePath.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && mentionMatches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveMentionIndex((prev) => (prev + 1) % mentionMatches.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveMentionIndex(
          (prev) => (prev - 1 + mentionMatches.length) % mentionMatches.length,
        );
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionMatches[activeMentionIndex].filePath);
      } else if (e.key === "Escape") {
        setMentionQuery(null);
      }
    }
  };

  return {
    textareaRef,
    mentionPopupRef,
    mentionQuery,
    mentionMatches,
    mentionPos,
    activeMentionIndex,
    setActiveMentionIndex,
    handleTextareaChange,
    handleTextareaKeyDown,
    insertMention,
  };
}