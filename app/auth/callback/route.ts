import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import { safeNext } from "@/lib/safe-next"
import { ensureTherapist } from "@/lib/therapists"

// Where Google/Apple/Microsoft and magic links land (PKCE): exchange the code for a session,
// make sure the user has a profile row, then continue to ?next= (default: the connect screen).
// Payments will slot in here later as a pay-then-connect step before /connect.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = safeNext(searchParams.get("next"))

  if (code) {
    const response = NextResponse.redirect(new URL(next, origin))
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      await ensureTherapist(supabase, data.user)
      // Return the response the session cookies were set on
      return response
    }
  }

  const failed = new URL("/login", origin)
  failed.searchParams.set("error", searchParams.get("error") ? "provider" : "invalid_token")
  if (next !== "/connect") failed.searchParams.set("next", next)
  return NextResponse.redirect(failed)
}
