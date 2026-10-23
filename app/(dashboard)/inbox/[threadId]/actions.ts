"use server";

import { replyToThread } from "@/lib/email/reply";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { threads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
