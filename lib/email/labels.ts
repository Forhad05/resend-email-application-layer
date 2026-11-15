export interface LabelConfig {
  name: string;
  color: string;
  description: string;
}

export const PRESET_LABELS: LabelConfig[] = [
  {
    name: "bug",
    color: "red",
    description: "Software defects and technical glitches",
  },
  {
    name: "billing",
    color: "emerald",
    description: "Invoices, subscriptions, and payment queries",
  },
  {
    name: "feature-request",
    color: "purple",
    description: "Product suggestions and enhancements",
  },
  {
    name: "urgent",
    color: "rose",
    description: "Critical blocker or time-sensitive escalation",
  },
  {
    name: "vip",
    color: "amber",
    description: "High-priority customer account",
  },
  {
    name: "sales",
    color: "blue",
    description: "Pre-sales inquiries and upgrades",
  },
];

/**
 * Normalizes label string: lowercase, trims, replaces spaces with hyphens,
 * strips special characters, limits length to 25 chars.
 */
export function cleanLabel(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 25);
}

/**
 * Returns Tailwind CSS color classes for a label badge
 */
export function getLabelColorClass(label: string): string {
  const normalized = cleanLabel(label);

  switch (normalized) {
    case "bug":
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900";
    case "billing":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900";
    case "feature-request":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-900";
    case "urgent":
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900";
    case "vip":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900";
    case "sales":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900";
    default:
      return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
  }
}
