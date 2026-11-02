import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { listConnections } from "@/lib/connections"

// Polled by the connect screen to flip to "Connected" once an AI app reaches the MCP server
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  return NextResponse.json({ connections: await listConnections(supabase) }, { headers: { "Cache-Control": "no-store" } })
}
