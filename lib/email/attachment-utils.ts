// Max 25 MB total attachments per email to comply safely with Resend API
export const MAX_ATTACHMENTS_TOTAL_BYTES = 25 * 1024 * 1024;

/**
 * Format bytes into human-friendly strings (e.g. "1.4 MB", "420 KB")
 * Client-safe with 0 Node.js dependencies.
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

