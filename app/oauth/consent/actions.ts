"use server"

import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase-server"

// Approve or deny an MCP client's (Claude, ChatGPT) request to act on this account.
// Supabase returns the client's callback URL with the code (or access_denied) attached.
export async function decideAuthorization(formData: FormData) {
  const authorizationId = String(formData.get("authorization_id") ?? "")
  const approve = formData.get("decision") === "approve"
  const supabase = await createSupabaseServerClient()
  const { data, error } = approve
    ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
    : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true })
  if (error || !data?.redirect_url) {
    redirect(`/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}&error=1`)
  }
  redirect(data.redirect_url)
}
