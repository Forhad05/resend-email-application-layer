import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import {
  MAX_ATTACHMENTS_TOTAL_BYTES,
  formatFileSize,
} from "./attachment-utils";

export { MAX_ATTACHMENTS_TOTAL_BYTES, formatFileSize };

export interface OutboundAttachment {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  buffer: Buffer;
  storagePath: string;
  downloadUrl: string;
}

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "attachments");

/**
 * Persists an uploaded File to local attachment storage and returns
 * the structured attachment payload ready for both Resend and PostgreSQL.
 */
export async function processUploadedFile(file: File): Promise<OutboundAttachment> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const id = crypto.randomUUID();
  const cleanFilename = (file.name || "attachment").replace(
    /[^a-zA-Z0-9._-]/g,
    "_"
  );
  const storedFilename = `${id}_${cleanFilename}`;

  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const storagePath = path.join(UPLOADS_DIR, storedFilename);
  await fs.writeFile(storagePath, buffer);

  return {
    id,
    filename: file.name || "attachment",
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
    buffer,
    storagePath,
    downloadUrl: `/api/attachments/${id}`,
  };
}
