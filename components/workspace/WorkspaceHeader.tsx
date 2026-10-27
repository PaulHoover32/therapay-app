"use client";

import { PanelRight } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { usePanelStore } from "@/lib/stores/panel";

export default function WorkspaceHeader({ title }: { title?: string }) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const setMobileOpen = usePanelStore((s) => s.setMobileOpen);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <SidebarTrigger />
      <h1 className="min-w-0 flex-1 truncate text-sm font-medium">{title}</h1>
      {!isDesktop && (
        <Button variant="ghost" size="icon" className="size-8" onClick={() => setMobileOpen(true)} aria-label="Open side panel">
          <PanelRight className="size-4" />
        </Button>
      )}
    </header>
  );
}
