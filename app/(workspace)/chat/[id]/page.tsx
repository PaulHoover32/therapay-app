import { notFound } from "next/navigation";
import Conversation from "@/components/conversation/Conversation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getThreadMessages } from "@/lib/threads";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const messages = await getThreadMessages(supabase, user!.id, id);
  if (!messages) notFound();

  return <Conversation key={id} id={id} initialMessages={messages} firstName={null} isNewUser={false} />;
}
