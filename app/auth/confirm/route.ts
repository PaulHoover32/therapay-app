import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"
import { safeNext } from "@/lib/safe-next"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as "signup" | "recovery" | "email" | null
  // New signups go through the (future) billing step before getting their connector URL
  const next = safeNext(searchParams.get("next"), type === "signup" ? "/onboarding/billing" : undefined)

  if (token_hash && type) {
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
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      // Return the response the session cookies were set on
      return response
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=invalid_token", origin)
  )
}
