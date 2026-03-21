"use server";

import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";

export async function login(email: string, password: string): Promise<string | null> {
  console.log("[login] called with email:", email);
  try {
    const result = await signIn("credentials", { email, password, redirect: false });
    console.log("[login] signIn result:", result);
    return null;
  } catch (error) {
    console.log("[login] error type:", error?.constructor?.name, "message:", (error as Error)?.message);
    if (error instanceof AuthError) {
      return "Invalid email or password.";
    }
    return "Something went wrong. Please try again.";
  }
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
