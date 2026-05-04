import { create } from 'zustand';

export type MainViewType = 'dashboard' | 'session-ledger' | 'goal-planner' | 'none';

export interface ConversationNote {
  id: string;
  timestamp: Date;
  content: string;
}

interface ViewState {
  mainView: MainViewType;
  notes: ConversationNote[];
  setMainView: (view: MainViewType) => void;
  addNote: (content: string) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  mainView: 'dashboard',
  notes: [],

  setMainView: (mainView) => set({ mainView }),

  addNote: (content) =>
    set((state) => ({
      notes: [
        ...state.notes,
        { id: `note-${Date.now()}`, timestamp: new Date(), content },
      ],
    })),
}));
