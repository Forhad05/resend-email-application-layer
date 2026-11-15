"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import {
  Tag,
  Plus,
  X,
  Loader2,
  Check,
} from "lucide-react";
import {
  PRESET_LABELS,
  cleanLabel,
  getLabelColorClass,
} from "@/lib/email/labels";
import {
  addThreadLabelAction,
  removeThreadLabelAction,
} from "@/app/(dashboard)/inbox/[threadId]/actions";

interface ThreadTagEditorProps {
  threadId: string;
  initialLabels: string[];
}

export function ThreadTagEditor({
  threadId,
  initialLabels = [],
}: ThreadTagEditorProps) {
  const [labels, setLabels] = useState<string[]>(initialLabels);
  const [prevInitialLabels, setPrevInitialLabels] = useState(initialLabels);
  const [isOpen, setIsOpen] = useState(false);
  const [customTagInput, setCustomTagInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state if initialLabels prop changes from server revalidation
  if (initialLabels !== prevInitialLabels) {
    setPrevInitialLabels(initialLabels);
    setLabels(initialLabels);
  }

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    let focusTimer: NodeJS.Timeout | null = null;
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Auto-focus input when opened
      focusTimer = setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [isOpen]);

  const handleAddLabel = (rawTag: string) => {
    const tag = cleanLabel(rawTag);
    if (!tag || labels.includes(tag)) {
      setCustomTagInput("");
      return;
    }

    // Optimistic update
    const previous = labels;
    setLabels([...labels, tag]);
    setCustomTagInput("");

    startTransition(async () => {
      const res = await addThreadLabelAction(threadId, tag);
      if (!res.success) {
        setLabels(previous); // Rollback on failure
      }
    });
  };

  const handleRemoveLabel = (rawTag: string) => {
    const tag = cleanLabel(rawTag);
    // Optimistic update
    const previous = labels;
    setLabels(labels.filter((l) => l !== tag));

    startTransition(async () => {
      const res = await removeThreadLabelAction(threadId, tag);
      if (!res.success) {
        setLabels(previous); // Rollback on failure
      }
    });
  };

  const availablePresets = PRESET_LABELS.filter(
    (preset) => !labels.includes(preset.name)
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5 relative" ref={dropdownRef}>
      {/* Existing Labels */}
      {labels.map((label) => {
        const colorClass = getLabelColorClass(label);
        return (
          <span
            key={label}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${colorClass}`}
          >
            <span>#{label}</span>
            <button
              type="button"
              onClick={() => handleRemoveLabel(label)}
              disabled={isPending}
              title={`Remove ${label}`}
              className="hover:opacity-75 focus:outline-hidden rounded-full p-0.5 -mr-1 text-inherit"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}

      {/* Add Tag Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white/50 dark:bg-zinc-900/50 transition-colors"
      >
        {isPending ? (
          <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
        ) : (
          <Plus className="h-3 w-3" />
        )}
        <span>Tag</span>
      </button>

      {/* Tag Selector Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-40 w-64 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl p-3 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 text-xs">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-zinc-400" />
              Manage Labels
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Custom Tag Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddLabel(customTagInput);
            }}
            className="flex items-center gap-1.5"
          >
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">
                #
              </span>
              <input
                ref={inputRef}
                type="text"
                placeholder="New label..."
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                maxLength={25}
                className="w-full pl-6 pr-2 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-black dark:focus:ring-white"
              />
            </div>
            <button
              type="submit"
              disabled={!customTagInput.trim()}
              className="px-2.5 py-1.5 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </form>

          {/* Quick Presets */}
          {availablePresets.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Preset Labels
              </div>
              <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                {availablePresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleAddLabel(preset.name)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-transform hover:scale-105 ${getLabelColorClass(
                      preset.name
                    )}`}
                  >
                    <span>+{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {labels.length > 0 && (
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
              <span>{labels.length} applied</span>
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <Check className="h-3 w-3" /> Auto-saved
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
