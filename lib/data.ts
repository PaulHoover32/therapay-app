import { TherapistProfile, Session } from "@/lib/types";
import { seedProfile, seedSessions } from "@/lib/seed-data";

export async function getTherapistProfile(): Promise<TherapistProfile> {
  return seedProfile;
}

export async function getSessionLogs(): Promise<Session[]> {
  return seedSessions;
}

export async function getSessionById(id: string): Promise<Session> {
  const session = seedSessions.find((s) => s.id === id);
  if (!session) throw new Error(`Session not found: ${id}`);
  return session;
}
