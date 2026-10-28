"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, SquarePen, Trash2, Settings, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useThreadsStore } from "@/lib/stores/threads";
import type { ThreadSummary } from "@/lib/threads";
import { groupThreadsByDate } from "@/lib/thread-groups";
import RenameThreadDialog from "./RenameThreadDialog";

interface Props {
  userId: string;
  name: string;
  avatarUrl: string | null;
  initialThreads: ThreadSummary[];
}

export default function ThreadSidebar({ userId, name, avatarUrl, initialThreads }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const version = useThreadsStore((s) => s.version);
  const bump = useThreadsStore((s) => s.bump);
  const [threads, setThreads] = useState(initialThreads);
  const [renaming, setRenaming] = useState<ThreadSummary | null>(null);

  useEffect(() => {
    if (version === 0) return;
    createSupabaseBrowserClient()
      .from("chat_sessions")
      .select("id, title, updated_at")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(100)
      .then(({ data }) => data && setThreads(data));
  }, [version, userId]);

  async function rename(id: string, title: string) {
    setThreads((ts) => ts.map((t) => (t.id === id ? { ...t, title } : t)));
    await createSupabaseBrowserClient().from("chat_sessions").update({ title }).eq("id", id);
    bump();
  }

  async function remove(id: string) {
    setThreads((ts) => ts.filter((t) => t.id !== id));
    await createSupabaseBrowserClient()
      .from("chat_sessions")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id);
    if (pathname === `/chat/${id}`) router.push("/chat");
  }

  async function signOut() {
    await createSupabaseBrowserClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const groups = groupThreadsByDate(threads);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between px-2 pt-1">
          <span className="text-sm font-semibold tracking-tight">Therapay</span>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              {/* /chat is dynamic: each visit gets a new thread id, so the conversation remounts */}
              <Link href="/chat">
                <SquarePen />
                <span>New chat</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {threads.length === 0 && (
          <p className="px-4 py-6 text-xs text-muted-foreground">Your conversations will show up here.</p>
        )}
        {groups.map(({ label, items }) => (
          <SidebarGroup key={label}>
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <SidebarMenu>
              {items.map((t) => (
                <SidebarMenuItem key={t.id}>
                  <SidebarMenuButton asChild isActive={pathname === `/chat/${t.id}`}>
                    <Link href={`/chat/${t.id}`}>
                      <span className="truncate">{t.title || "Untitled"}</span>
                    </Link>
                  </SidebarMenuButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction showOnHover aria-label="Conversation actions">
                        <MoreHorizontal />
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start">
                      <DropdownMenuItem onSelect={() => setRenaming(t)}>
                        <Pencil /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => remove(t.id)}>
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="size-7">
                    <AvatarImage src={avatarUrl ?? undefined} alt="" className="object-cover" />
                    <AvatarFallback className="text-xs">{name.slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm">{name}</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={signOut}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <RenameThreadDialog
        thread={renaming}
        onClose={() => setRenaming(null)}
        onSave={(title) => renaming && rename(renaming.id, title)}
      />
    </Sidebar>
  );
}
