/**
 * store/overlays.ts — Transient overlay/panel visibility.
 *
 * Mirrors desktop/frontend/src/store/overlays.ts.
 * Standalone client has fewer overlays (stats modal only for now).
 */

import { create } from "zustand";

interface OverlaysStore {
  statsOpen: boolean;
  setStatsOpen: (open: boolean) => void;
}

export const useOverlaysStore = create<OverlaysStore>((set) => ({
  statsOpen: false,
  setStatsOpen: (open: boolean) => set({ statsOpen: open }),
}));
