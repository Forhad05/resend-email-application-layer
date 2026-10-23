"use server";

import { db } from "@/lib/db";
import { threads } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getUnreadCountAction(): Promise<number> {
  try {
    const [result] = await db
      .select({ count: count() })
      .from(threads)
      .where(eq(threads.isRead, false));

    return Number(result?.count ?? 0);
  } catch (err: unknown) {
    console.error("Failed to fetch unread count:", err);
    return 0;
  }
}

export async function checkInboxUpdatesAction(
  lastKnownTimestamp: string | null,
  lastKnownUnreadCount: number
): Promise<{ hasUpdates: boolean; unreadCount: number; latestTimestamp: string | null }> {
  try {
    const [latest] = await db
      .select({ lastMessageAt: threads.lastMessageAt })
      .from(threads)
      .orderBy(desc(threads.lastMessageAt))
      .limit(1);

    const [unreadResult] = await db
      .select({ count: count() })
      .from(threads)
      .where(eq(threads.isRead, false));

    const currentUnread = Number(unreadResult?.count ?? 0);
    const currentTimestamp = latest?.lastMessageAt?.toISOString() || null;

    const hasUpdates =
      currentUnread !== lastKnownUnreadCount ||
      (currentTimestamp !== null && currentTimestamp !== lastKnownTimestamp);

    return {
      hasUpdates,
      unreadCount: currentUnread,
      latestTimestamp: currentTimestamp,
    };
  } catch (err: unknown) {
    console.error("Failed to check inbox updates:", err);
    return { hasUpdates: false, unreadCount: lastKnownUnreadCount, latestTimestamp: lastKnownTimestamp };
  }
}

export async function toggleThreadReadAction(threadId: string, isRead: boolean) {
  try {
    await db
      .update(threads)
      .set({
        isRead,
        updatedAt: new Date(),
      })
      .where(eq(threads.id, threadId));

    revalidatePath("/inbox");
    revalidatePath(`/inbox/${threadId}`);
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to toggle thread read state:", err);
    return { success: false };
  }
}

