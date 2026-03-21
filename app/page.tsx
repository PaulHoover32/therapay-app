import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { findAccount } from "@/lib/accounts";
import Dashboard from "@/components/Dashboard";
import NavBar from "@/components/NavBar";
import { Toaster } from "@/components/ui/sonner";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const account = findAccount(session.user.email);
  if (!account) redirect("/login");

  return (
    <>
      <NavBar name={account.profile.name} />
      <main className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Dashboard initialSessions={account.sessions} profile={account.profile} />
        </div>
      </main>
      <Toaster richColors position="bottom-right" />
    </>
  );
}
