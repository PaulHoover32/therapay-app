import { create } from "zustand";
import type { PanelState } from "@/lib/panel-views";

interface PanelStore {
  current: PanelState;
  history: PanelState[];
  // Bumped whenever data a panel might show has changed
  dataVersion: number;
  mobileOpen: boolean;
  show: (state: PanelState) => void;
  back: () => void;
  invalidate: () => void;
  setMobileOpen: (open: boolean) => void;
}

const MAX_HISTORY = 10;

export const usePanelStore = create<PanelStore>((set) => ({
  current: { view: "summary" },
  history: [],
  dataVersion: 0,
  mobileOpen: false,
  show: (next) =>
    set((s) => ({
      current: next,
      history: [...s.history, s.current].slice(-MAX_HISTORY),
      mobileOpen: true,
    })),
  back: () =>
    set((s) => {
      if (!s.history.length) return s;
      return { current: s.history[s.history.length - 1], history: s.history.slice(0, -1) };
    }),
  invalidate: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
  setMobileOpen: (mobileOpen) => set({ mobileOpen }),
}));
