import { useState } from "react";
import { sanitizeSocraticAnswers } from "../utils/socraticPrompt";

export interface UseSocraticGateReturn {
  isOpen: boolean;
  critiqueText: string;
  answersText: string;
  hasConfrontation: boolean;
  isPersisting: boolean;
  setCritiqueText: (text: string) => void;
  setAnswersText: (text: string) => void;
  openModal: () => void;
  closeModal: () => void;
  applyFortifiedCriteria: (
    onApply: (fortifiedText: string) => Promise<void> | void,
  ) => Promise<boolean>;
  resetConfrontation: () => void;
}

export function useSocraticGate(): UseSocraticGateReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [critiqueText, setCritiqueText] = useState("");
  const [answersText, setAnswersText] = useState("");
  const [hasConfrontation, setHasConfrontation] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  const applyFortifiedCriteria = async (
    onApply: (fortifiedText: string) => Promise<void> | void,
  ): Promise<boolean> => {
    const check = sanitizeSocraticAnswers(answersText);
    if (!check.isValid) {
      return false;
    }

    setIsPersisting(true);
    try {
      const fortifiedSection = `\n\n### Fortified Logic & Edge-Case Rules (Socratic Gate Resolved):\n${check.sanitized}`;
      await onApply(fortifiedSection);
      setHasConfrontation(true);
      setIsOpen(false);
      return true;
    } finally {
      setIsPersisting(false);
    }
  };

  const resetConfrontation = () => {
    setIsOpen(false);
    setCritiqueText("");
    setAnswersText("");
    setHasConfrontation(false);
  };

  return {
    isOpen,
    critiqueText,
    answersText,
    hasConfrontation,
    isPersisting,
    setCritiqueText,
    setAnswersText,
    openModal,
    closeModal,
    applyFortifiedCriteria,
    resetConfrontation,
  };
}