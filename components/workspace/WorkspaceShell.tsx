"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { usePanelStore } from "@/lib/stores/panel";
import type { ThreadSummary } from "@/lib/threads";
import ThreadSidebar from "./ThreadSidebar";
import SidePanel from "@/components/panel/SidePanel";
import { WorkspaceContext } from "./WorkspaceContext";

interface Props {
  userId: string;
  name: string;
  avatarUrl: string | null;
  initialThreads: ThreadSummary[];
  children: React.ReactNode;
}

export default function WorkspaceShell({ userId, name, avatarUrl, initialThreads, children }: Props) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const mobileOpen = usePanelStore((s) => s.mobileOpen);
  const setMobileOpen = usePanelStore((s) => s.setMobileOpen);

  return (
    <WorkspaceContext.Provider value={{ userId, name }}>
    <SidebarProvider className="h-svh overflow-hidden">
      <ThreadSidebar userId={userId} name={name} avatarUrl={avatarUrl} initialThreads={initialThreads} />
      <SidebarInset className="flex min-w-0 flex-row overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        {isDesktop && (
          <aside className="flex w-[400px] shrink-0 flex-col border-l xl:w-[460px]">
            <SidePanel />
          </aside>
        )}
      </SidebarInset>
      {!isDesktop && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="bottom" className="h-[85svh] gap-0 p-0">
            <SheetTitle className="sr-only">Side panel</SheetTitle>
            <SidePanel />
          </SheetContent>
        </Sheet>
      )}
    </SidebarProvider>
    </WorkspaceContext.Provider>
  );
}
