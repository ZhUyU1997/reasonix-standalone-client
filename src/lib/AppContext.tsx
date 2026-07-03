/**
 * AppContext.tsx — React Context for shared app state.
 *
 * Provides running/connState from appState + action callbacks,
 * so components don't need custom events or prop drilling.
 */

import { createContext, useContext } from "react";
import type { Action } from "../lib/transcriptTypes";

export interface AppContextValue {
  running: boolean;
  connState: string;
  /** The Transcript reducer dispatch — null until mounted. */
  dispatch: ((action: Action) => void) | null;
  /** Start a new session. */
  onNewSession: () => void;
  /** Open the rewind picker. */
  onOpenRewind: () => void;
}

const defaultValue: AppContextValue = {
  running: false,
  connState: "connected",
  dispatch: null,
  onNewSession: () => {},
  onOpenRewind: () => {},
};

const Ctx = createContext<AppContextValue>(defaultValue);

export function useApp(): AppContextValue {
  return useContext(Ctx);
}

export const AppContextProvider = Ctx.Provider;
