"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"

export async function disconnectApp(formData: FormData) {
  const clientId = String(formData.get("clientId") ?? "")
  const supabase = await createSupabaseServerClient()
  // Revoking the grant kills the app's tokens; drop its "connected" record too
  const { error } = await supabase.auth.oauth.revokeGrant({ clientId })
  if (error) throw new Error(error.message)
  await supabase.from("mcp_connections").delete().eq("client_id", clientId)
  revalidatePath("/account")
}

export async function signOut() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect("/")
}

export async function deleteAccount() {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc("delete_my_account")
  if (error) return { error: "Couldn't delete your account. Please try again or contact support." }
  await supabase.auth.signOut({ scope: "local" })
  redirect("/")
}
