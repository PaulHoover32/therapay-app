import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface ChatStore {
  currentSessionId: string | null;
  hasRecommendation: boolean;
  conversationKey: number;
  pendingStarter: string | null;
  createSession: () => Promise<void>;
  setHasRecommendation: () => void;
  newConversation: () => void;
  triggerStarter: (text: string) => void;
  clearPendingStarter: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      currentSessionId: null,
      hasRecommendation: false,
      conversationKey: 0,
      pendingStarter: null,

      createSession: async () => {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("chat_sessions")
          .insert({ user_id: user.id, messages: [] })
          .select("id")
          .single();

        if (data) {
          set({ currentSessionId: data.id });
        }
      },

      setHasRecommendation: () => set({ hasRecommendation: true }),

      newConversation: () =>
        set((state) => ({
          currentSessionId: null,
          hasRecommendation: false,
          conversationKey: state.conversationKey + 1,
        })),

      triggerStarter: (text: string) =>
        set((state) => ({
          pendingStarter: text,
          currentSessionId: null,
          hasRecommendation: false,
          conversationKey: state.conversationKey + 1,
        })),

      clearPendingStarter: () => set({ pendingStarter: null }),
    }),
    {
      name: "therapay-chat",
      partialize: (state) => ({
        currentSessionId: state.currentSessionId,
        conversationKey: state.conversationKey,
      }),
    }
  )
);
