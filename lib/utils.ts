import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitizes error messages to prevent database connection strings,
 * credentials, or internal server paths from leaking to client responses.
 */
export function sanitizeErrorMessage(msg: unknown): string {
  if (!msg) return "An unexpected error occurred.";
  const text = typeof msg === "string" ? msg : msg instanceof Error ? msg.message : String(msg);
  const sanitized = text
    .replace(/postgresql:\/\/[^@\s]+@[^\s/]+/gi, "postgresql://[redacted]")
    .replace(/\/home\/[^\s:]+/gi, "[internal path]")
    .replace(/key\s*=\s*['"][^'"]+['"]/gi, "key=[redacted]")
    .replace(/token\s*=\s*['"][^'"]+['"]/gi, "token=[redacted]");
  return sanitized.length > 250 ? sanitized.slice(0, 250) + "..." : sanitized;
}


