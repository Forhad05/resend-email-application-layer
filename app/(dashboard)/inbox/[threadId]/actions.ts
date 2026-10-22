"use server";

import { replyToThread } from "@/lib/email/reply";
import { revalidatePath } from "next/cache";

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

