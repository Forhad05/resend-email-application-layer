"use server";

import { replyToThread } from "@/lib/email/reply";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { threads, internalNotes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getTeamMembers } from "@/lib/db/team";

export async function replyAction(threadId: string, body: string) {
  if (!body.trim()) {
    return { success: false, error: "Reply body cannot be empty." };
  }

  const result = await replyToThread({
    threadId,
    body,
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
    await db
      .update(threads)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(threads.id, threadId));

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
    await db
      .update(threads)
      .set({
        priority,
        updatedAt: new Date(),
      })
      .where(eq(threads.id, threadId));

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
    await db
      .update(threads)
      .set({
        assignedTo: assignedTo || null,
        updatedAt: new Date(),
      })
      .where(eq(threads.id, threadId));

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

    await db.insert(internalNotes).values({
      threadId,
      authorId: effectiveAuthorId,
      content: content.trim(),
    });

    await db
      .update(threads)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(threads.id, threadId));

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
