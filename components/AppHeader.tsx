"use client";

import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/planner": "Planner",
  "/profile": "Profile",
};

export default function AppHeader({ name }: { name: string | null }) {
  const pathname = usePathname();
  const title = titles[pathname] ?? "Therapay";

  return (
    <header className="flex h-14 shrink-0 items-center border-b px-6 gap-3">
      <span className="text-sm font-medium">{title}</span>
      {name && (
        <span className="text-sm text-muted-foreground">/ {name}</span>
      )}
    </header>
  );
}
