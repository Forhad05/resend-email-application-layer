"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";

interface KeyboardShortcutsContextType {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType>({
  isModalOpen: false,
  openModal: () => {},
  closeModal: () => {},
  toggleModal: () => {},
});

export function useKeyboardShortcuts() {
  return useContext(KeyboardShortcutsContext);
}

export function isInputFocused(): boolean {
  if (typeof document === "undefined") return false;
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    (active as HTMLElement).isContentEditable
  );
}

export function KeyboardShortcutsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const sequencePrefix = useRef<string | null>(null);
  const sequenceTimer = useRef<NodeJS.Timeout | null>(null);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const toggleModal = useCallback(() => setIsModalOpen((prev) => !prev), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // 1. Always allow Escape to close modal
      if (e.key === "Escape") {
        if (isModalOpen) {
          setIsModalOpen(false);
          e.preventDefault();
          return;
        }
      }

      // 2. If typing inside input or textarea, skip global hotkeys
      if (isInputFocused()) {
        return;
      }

      // 3. Shortcuts modal toggle (?)
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleModal();
        return;
      }

      // 4. Handle two-key navigation sequences starting with 'g'
      if (sequencePrefix.current === "g") {
        sequencePrefix.current = null;
        if (sequenceTimer.current) clearTimeout(sequenceTimer.current);

        switch (e.key.toLowerCase()) {
          case "i":
            e.preventDefault();
            router.push("/inbox");
            return;
          case "c":
            e.preventDefault();
            router.push("/compose");
            return;
          case "t":
            e.preventDefault();
            router.push("/templates");
            return;
          case "a":
            e.preventDefault();
            router.push("/audit");
            return;
          case "s":
            e.preventDefault();
            router.push("/settings");
            return;
          default:
            break;
        }
      }

      // 5. Initiate 'g' navigation prefix
      if (e.key.toLowerCase() === "g" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        sequencePrefix.current = "g";
        if (sequenceTimer.current) clearTimeout(sequenceTimer.current);
        sequenceTimer.current = setTimeout(() => {
          sequencePrefix.current = null;
        }, 1200);
        return;
      }

      // 6. Global single-key hotkeys
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key.toLowerCase() === "c") {
          e.preventDefault();
          router.push("/compose");
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (sequenceTimer.current) clearTimeout(sequenceTimer.current);
    };
  }, [isModalOpen, router, toggleModal]);

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        isModalOpen,
        openModal,
        closeModal,
        toggleModal,
      }}
    >
      {children}
      <KeyboardShortcutsModal isOpen={isModalOpen} onClose={closeModal} />
    </KeyboardShortcutsContext.Provider>
  );
}
