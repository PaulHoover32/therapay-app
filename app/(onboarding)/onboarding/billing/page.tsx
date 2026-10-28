import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

// TODO(billing): checkout goes here, between signup and /connect. Until billing exists this
// step just continues; once it does, /connect should check for an active subscription.
export default function BillingPlaceholderPage() {
  return (
    <Card className="h-fit w-full max-w-md">
      <CardHeader>
        <CardTitle>You&apos;re in</CardTitle>
        <CardDescription>Therapay is free while we&apos;re in early access. Next, connect it to your AI app.</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href="/connect">Continue</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
