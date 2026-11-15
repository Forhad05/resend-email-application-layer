import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function getServerSession(): Promise<AuthSession> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session;
  } catch {
    // Outside request context (e.g. background jobs, scripts, test runner)
    return null;
  }
}

