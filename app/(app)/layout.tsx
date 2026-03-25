import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import AppHeader from "@/components/AppHeader";
import ChatPane from "@/components/chat/ChatPane";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let therapistName: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("therapists")
      .select("name")
      .eq("user_id", user.id)
      .single();
    therapistName = data?.name ?? null;
  }

  return (
    <SidebarProvider defaultOpen={false} className="h-full overflow-hidden">
      <AppSidebar />
      <SidebarInset className="flex-1 min-w-0 overflow-y-auto">
        <AppHeader name={therapistName} />
        {children}
      </SidebarInset>
      <ChatPane />
    </SidebarProvider>
  );
}
