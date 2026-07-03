/**
 * store/layout.ts — Sidebar + footer geometry state for the standalone client.
 *
 * Mirrors desktop/frontend/src/store/layout.ts but much simpler:
 * only the sidebar collapse flag (no right-dock, no resize in standalone).
 */

import { create } from "zustand";

interface LayoutStore {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
