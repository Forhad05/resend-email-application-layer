"use client";

import React from "react";
import { Keyboard, X, Sparkles } from "lucide-react";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  context?: string;
}

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const sections: { title: string; shortcuts: ShortcutItem[] }[] = [
    {
      title: "Inbox Navigation",
      shortcuts: [
        { keys: ["j", "↓"], description: "Highlight next conversation", context: "Inbox" },
        { keys: ["k", "↑"], description: "Highlight previous conversation", context: "Inbox" },
        { keys: ["Enter", "o"], description: "Open highlighted conversation", context: "Inbox" },
        { keys: ["e"], description: "Quick resolve/close ticket", context: "Inbox / Thread" },
        { keys: ["/"], description: "Focus search bar", context: "Global" },
      ],
    },
    {
      title: "Thread Actions",
      shortcuts: [
        { keys: ["r"], description: "Focus reply box & jump to reply", context: "Thread" },
        { keys: ["e"], description: "Toggle ticket status (Resolve / Open)", context: "Thread" },
        { keys: ["u"], description: "Return to inbox list", context: "Thread" },
        { keys: ["⌘/Ctrl", "Enter"], description: "Send reply or composed email", context: "Editor" },
      ],
    },
    {
      title: "Global Navigation",
      shortcuts: [
        { keys: ["c"], description: "Compose new message", context: "Global" },
        { keys: ["g", "i"], description: "Go to Inbox", context: "Global" },
        { keys: ["g", "c"], description: "Go to Compose", context: "Global" },
        { keys: ["g", "t"], description: "Go to Templates", context: "Global" },
        { keys: ["g", "a"], description: "Go to Audit Log", context: "Global" },
        { keys: ["?"], description: "Open / close this shortcuts cheat sheet", context: "Global" },
        { keys: ["Esc"], description: "Close modal / unfocus search", context: "Global" },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Keyboard className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-1.5">
                Keyboard Shortcuts
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                  Speed Mode
                </span>
              </h3>
              <p className="text-xs text-zinc-500">
                Velocity hotkeys for high-speed ticket triage & reply
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.title} className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                {section.title}
              </h4>
              <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 divide-y divide-zinc-100 dark:divide-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 overflow-hidden">
                {section.shortcuts.map((sc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3.5 py-2 text-xs"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                      {sc.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {sc.keys.map((k, kIdx) => (
                        <React.Fragment key={kIdx}>
                          {kIdx > 0 && sc.keys[0] === "g" ? (
                            <span className="text-[10px] text-zinc-400">then</span>
                          ) : kIdx > 0 && sc.keys[0] !== "g" ? (
                            <span className="text-[10px] text-zinc-400">or</span>
                          ) : null}
                          <kbd className="inline-flex items-center justify-center min-w-[20px] px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 shadow-2xs">
                            {k}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-1 text-[11px]">
            <Sparkles className="h-3 w-3 text-amber-500" />
            Shortcuts are automatically disabled inside input fields
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium text-xs hover:opacity-90"
          >
            Got it (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
