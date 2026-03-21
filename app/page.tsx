import { sessions, profile } from "@/lib/seed-data";
import Dashboard from "@/components/Dashboard";
import { Toaster } from "@/components/ui/sonner";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Therapay</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, {profile.name}
          </p>
        </div>
        <Dashboard initialSessions={sessions} profile={profile} />
      </div>
      <Toaster richColors position="bottom-right" />
    </main>
  );
}
