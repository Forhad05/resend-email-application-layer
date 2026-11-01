import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { attachments } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import fs from "fs/promises";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;

  if (!id) {
    return new NextResponse("Attachment ID required", { status: 400 });
  }

  try {
    // 1. Query attachment metadata from PostgreSQL
    const [att] = await db
      .select()
      .from(attachments)
      .where(
        or(
          eq(attachments.id, id),
          eq(attachments.resendUrl, `/api/attachments/${id}`)
        )
      )
      .limit(1);

    if (!att || !att.storagePath) {
      return new NextResponse("Attachment not found", { status: 404 });
    }

    // 2. Read file from disk
    const fileBuffer = await fs.readFile(att.storagePath);

    // 3. Return file download response
    const safeFilename = encodeURIComponent(att.filename);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": att.contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${att.filename}"; filename*=UTF-8''${safeFilename}`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("Error serving attachment:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

