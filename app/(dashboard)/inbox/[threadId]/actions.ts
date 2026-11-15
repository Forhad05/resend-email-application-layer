"use server";

import { replyToThread } from "@/lib/email/reply";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { threads, internalNotes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getTeamMembers } from "@/lib/db/team";
import {
  processUploadedFile,
  MAX_ATTACHMENTS_TOTAL_BYTES,
  formatFileSize,
  OutboundAttachment,
} from "@/lib/email/attachments";
import { logAuditEvent } from "@/lib/audit";
import { cleanLabel } from "@/lib/email/labels";

export async function replyAction(
  threadIdOrFormData: string | FormData,
  maybeBody?: string,
  optionalFormData?: FormData
) {
  let threadId = "";
  let body = "";
  let formData: FormData | null = null;

  if (typeof threadIdOrFormData === "string") {
    threadId = threadIdOrFormData;
    body = maybeBody || "";
    formData = optionalFormData || null;
  } else {
    formData = threadIdOrFormData;
    threadId = (formData.get("threadId") as string) || "";
    body = (formData.get("body") as string) || "";
  }

  if (!body.trim()) {
    return { success: false, error: "Reply body cannot be empty." };
  }

  const attachments: OutboundAttachment[] = [];
  if (formData) {
    const rawFiles = formData.getAll("files") as File[];
    const validFiles = rawFiles.filter(
      (f) => f && typeof f.size === "number" && f.size > 0 && f.name
    );

    let totalBytes = 0;
    for (const f of validFiles) {
      totalBytes += f.size;
    }

    if (totalBytes > MAX_ATTACHMENTS_TOTAL_BYTES) {
      return {
        success: false,
        error: `Total attachments size (${formatFileSize(
          totalBytes
        )}) exceeds the 25 MB limit.`,
      };
    }

    for (const f of validFiles) {
      const processed = await processUploadedFile(f);
      attachments.push(processed);
    }
  }

  const result = await replyToThread({
    threadId,
    body,
    attachments: attachments.length > 0 ? attachments : undefined,
  });

  if (result.success) {
    revalidatePath(`/inbox/${threadId}`);
    revalidatePath("/inbox");
  }

  return result;
}

export async function markThreadAsReadAction(threadId: string) {
  try {
    await db
      .update(threads)
      .set({
        isRead: true,
        updatedAt: new Date(),
      })
      .where(eq(threads.id, threadId));

    revalidatePath("/inbox");
    revalidatePath(`/inbox/${threadId}`);
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to mark thread as read:", err);
    return { success: false };
  }
}

export async function checkThreadUpdatesAction(
  threadId: string,
  knownMessageCount: number,
  knownLastTimestamp: string | null
) {
  try {
    const [thread] = await db
      .select({
        messageCount: threads.messageCount,
        lastMessageAt: threads.lastMessageAt,
        status: threads.status,
      })
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (!thread) {
      return { exists: false, hasNewMessages: false };
    }

    const currentCount = thread.messageCount || 0;
    const currentTimestamp = thread.lastMessageAt?.toISOString() || null;

    const hasNewMessages =
      currentCount > knownMessageCount ||
      (currentTimestamp !== null && currentTimestamp !== knownLastTimestamp);

    return {
      exists: true,
      hasNewMessages,
      messageCount: currentCount,
      lastMessageAt: currentTimestamp,
      status: thread.status,
    };
  } catch (err: unknown) {
    console.error("Failed to check thread updates:", err);
    return { exists: true, hasNewMessages: false };
  }
}

export async function updateThreadStatusAction(
  threadId: string,
  status: "open" | "pending" | "resolved" | "closed"
) {
  try {
    const [current] = await db
      .select({ status: threads.status })
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    await db
      .update(threads)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(threads.id, threadId));

    await logAuditEvent({
      action: "thread.status_updated",
      entityType: "thread",
      entityId: threadId,
      details: {
        previousStatus: current?.status || "unknown",
        newStatus: status,
      },
    });

    revalidatePath(`/inbox/${threadId}`);
    revalidatePath("/inbox");
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to update thread status:", err);
    return { success: false, error: "Failed to update thread status" };
  }
}

export async function updateThreadPriorityAction(
  threadId: string,
  priority: "low" | "normal" | "high" | "urgent"
) {
  try {
    const [current] = await db
      .select({ priority: threads.priority })
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    await db
      .update(threads)
      .set({
        priority,
        updatedAt: new Date(),
      })
      .where(eq(threads.id, threadId));

    await logAuditEvent({
      action: "thread.priority_updated",
      entityType: "thread",
      entityId: threadId,
      details: {
        previousPriority: current?.priority || "normal",
        newPriority: priority,
      },
    });

    revalidatePath(`/inbox/${threadId}`);
    revalidatePath("/inbox");
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to update thread priority:", err);
    return { success: false, error: "Failed to update thread priority" };
  }
}

export async function updateThreadAssigneeAction(
  threadId: string,
  assignedTo: string | null
) {
  try {
    const [current] = await db
      .select({ assignedTo: threads.assignedTo })
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    await db
      .update(threads)
      .set({
        assignedTo: assignedTo || null,
        updatedAt: new Date(),
      })
      .where(eq(threads.id, threadId));

    await logAuditEvent({
      action: "thread.assigned",
      entityType: "thread",
      entityId: threadId,
      details: {
        previousAssigneeId: current?.assignedTo || null,
        newAssigneeId: assignedTo || null,
      },
    });

    revalidatePath(`/inbox/${threadId}`);
    revalidatePath("/inbox");
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to update thread assignee:", err);
    return { success: false, error: "Failed to update thread assignee" };
  }
}

export async function createInternalNoteAction(
  threadId: string,
  content: string,
  authorId?: string
) {
  try {
    if (!content.trim()) {
      return { success: false, error: "Note content cannot be empty" };
    }

    let effectiveAuthorId = authorId;
    if (!effectiveAuthorId) {
      const team = await getTeamMembers();
      effectiveAuthorId = team[0]?.id || "user_apon_01";
    }

    const [newNote] = await db
      .insert(internalNotes)
      .values({
        threadId,
        authorId: effectiveAuthorId,
        content: content.trim(),
      })
      .returning({ id: internalNotes.id });

    await db
      .update(threads)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(threads.id, threadId));

    await logAuditEvent({
      actor: effectiveAuthorId ? { id: effectiveAuthorId } : undefined,
      action: "thread.note_added",
      entityType: "thread",
      entityId: threadId,
      details: {
        noteId: newNote?.id,
        preview: content.trim().slice(0, 100),
      },
    });

    revalidatePath(`/inbox/${threadId}`);
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to create internal note:", err);
    return { success: false, error: "Failed to create internal note" };
  }
}

export async function getTeamMembersAction() {
  return await getTeamMembers();
}

export async function addThreadLabelAction(threadId: string, rawLabel: string) {
  try {
    const label = cleanLabel(rawLabel);
    if (!label) {
      return { success: false, error: "Label cannot be empty" };
    }

    const [thread] = await db
      .select({ labels: threads.labels })
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (!thread) {
      return { success: false, error: "Thread not found" };
    }

    const currentLabels = thread.labels || [];
    if (currentLabels.includes(label)) {
      return { success: true, labels: currentLabels };
    }

    const updatedLabels = [...currentLabels, label];

    await db
      .update(threads)
      .set({
        labels: updatedLabels,
        updatedAt: new Date(),
      })
      .where(eq(threads.id, threadId));

    await logAuditEvent({
      action: "thread.label_added",
      entityType: "thread",
      entityId: threadId,
      details: { label, allLabels: updatedLabels },
    });

    try {
      revalidatePath(`/inbox/${threadId}`);
      revalidatePath("/inbox");
    } catch {
      // Revalidation may fail outside Next.js request context
    }

    return { success: true, labels: updatedLabels };
  } catch (err: unknown) {
    console.error("Failed to add thread label:", err);
    return { success: false, error: "Failed to add label" };
  }
}

export async function removeThreadLabelAction(threadId: string, rawLabel: string) {
  try {
    const label = cleanLabel(rawLabel);

    const [thread] = await db
      .select({ labels: threads.labels })
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (!thread) {
      return { success: false, error: "Thread not found" };
    }

    const currentLabels = thread.labels || [];
    const updatedLabels = currentLabels.filter((l) => l !== label);

    await db
      .update(threads)
      .set({
        labels: updatedLabels,
        updatedAt: new Date(),
      })
      .where(eq(threads.id, threadId));

    await logAuditEvent({
      action: "thread.label_removed",
      entityType: "thread",
      entityId: threadId,
      details: { label, allLabels: updatedLabels },
    });

    try {
      revalidatePath(`/inbox/${threadId}`);
      revalidatePath("/inbox");
    } catch {
      // Revalidation may fail outside Next.js request context
    }

    return { success: true, labels: updatedLabels };
  } catch (err: unknown) {
    console.error("Failed to remove thread label:", err);
    return { success: false, error: "Failed to remove label" };
  }
}
