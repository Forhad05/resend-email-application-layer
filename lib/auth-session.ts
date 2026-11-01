import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function getServerSession(): Promise<AuthSession> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch (error) {
    console.error("Failed to retrieve server session:", error);
    return null;
  }
}

