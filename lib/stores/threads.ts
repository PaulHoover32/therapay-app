import { create } from "zustand";

// Signals the history sidebar to refetch after a conversation is saved or changed
export const useThreadsStore = create<{ version: number; bump: () => void }>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));
