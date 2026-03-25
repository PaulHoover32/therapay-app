import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface ChatStore {
  currentSessionId: string | null;
  hasRecommendation: boolean;
  conversationKey: number;
  createSession: () => Promise<void>;
  setHasRecommendation: () => void;
  newConversation: () => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      currentSessionId: null,
      hasRecommendation: false,
      conversationKey: 0,

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
