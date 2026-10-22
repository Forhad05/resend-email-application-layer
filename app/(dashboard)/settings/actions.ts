"use server";

import { revalidatePath } from "next/cache";
import {
  createSenderIdentity,
  deleteSenderIdentity,
  setDefaultSenderIdentity,
} from "@/lib/email/senders";

export async function addSenderIdentityAction(formData: FormData) {
  try {
    const name = formData.get("name")?.toString().trim();
    const prefix = formData.get("prefix")?.toString().trim().replace(/^@+/, "");
    const domain = formData.get("domain")?.toString().trim();
    const isDefault = formData.get("isDefault") === "on";

    if (!name || !prefix || !domain) {
      return { success: false, error: "Name, mailbox prefix, and domain are required." };
    }

    const email = `${prefix}@${domain}`.toLowerCase();

    await createSenderIdentity({
      name,
      email,
      domain,
      isDefault,
    });

    revalidatePath("/settings");
    revalidatePath("/compose");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error creating sender identity:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create sender identity.",
    };
  }
}

export async function deleteSenderIdentityAction(id: string) {
  try {
    await deleteSenderIdentity(id);
    revalidatePath("/settings");
    revalidatePath("/compose");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error deleting sender identity:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete sender identity.",
    };
  }
}

export async function setDefaultSenderIdentityAction(id: string) {
  try {
    await setDefaultSenderIdentity(id);
    revalidatePath("/settings");
    revalidatePath("/compose");
    return { success: true };
  } catch (err: unknown) {
    console.error("Error setting default sender identity:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to set default sender identity.",
    };
  }
}

