import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export const DEFAULT_TEAM_MEMBERS = [
  {
    id: "user_apon_01",
    name: "Mahafuzul Haq (Apon)",
    email: "mahafuzul@mail.systemdevify.com",
    role: "admin",
  },
  {
    id: "user_sarah_02",
    name: "Sarah Jenkins",
    email: "support@mail.systemdevify.com",
    role: "agent",
  },
  {
    id: "user_alex_03",
    name: "Alex Rivera",
    email: "contracts@mail.systemdevify.com",
    role: "agent",
  },
];

export async function getTeamMembers() {
  try {
    const existing = await db.select().from(user);
    if (existing.length > 0) {
      return existing;
    }

    // Auto-seed defaults if table has no members yet
    for (const member of DEFAULT_TEAM_MEMBERS) {
      await db
        .insert(user)
        .values({
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          emailVerified: true,
          isActive: true,
        })
        .onConflictDoNothing();
    }

    return await db.select().from(user);
  } catch (err: unknown) {
    console.error("Failed to load or seed team members:", err);
    return [];
  }
}

