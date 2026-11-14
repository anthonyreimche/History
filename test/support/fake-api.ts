// A stand-in Safelight API over real React and zustand. The develop store holds
// an edit history the way core's does, goToHistory moves through it as core's
// does (and is recorded), and so is every registration.

import * as React from "react";
import { create } from "zustand";
import type {
  DevelopStoreState,
  EditSnapshot,
  PanelContribution,
  ParamDescriptor,
  SafelightAPI,
  StoreApi,
  StylesheetContribution,
  UiTokens,
} from "../../src/safelight";

export const TOKENS: UiTokens = {
  surface3: "var(--color-surface-3)",
  textPrimary: "var(--color-text-primary)",
  textSecondary: "var(--color-text-secondary)",
  textMuted: "var(--color-text-muted)",
  accent: "var(--color-accent)",
};

export interface Rig {
  api: SafelightAPI;
  develop: StoreApi<DevelopStoreState>;
  /** Every index goToHistory was called with, in order. */
  moves: number[];
  panels: PanelContribution[];
  stylesheets: StylesheetContribution[];
}

export const snapshot = (
  label: string,
  params: EditSnapshot["params"] = {},
  paramBag: EditSnapshot["paramBag"] = {},
): EditSnapshot => ({ timestamp: 0, label, params, paramBag });

/** A develop store holding `history`, showing step `at` (the newest unless
 *  told). With no history, no photo is open: index -1, as core starts. */
export function fakeApi({
  history = [],
  at = history.length - 1,
  descriptors = {},
}: { history?: EditSnapshot[]; at?: number; descriptors?: Record<string, ParamDescriptor> } = {}): Rig {
  const moves: number[] = [];
  const panels: PanelContribution[] = [];
  const stylesheets: StylesheetContribution[] = [];
  const develop: StoreApi<DevelopStoreState> = create<DevelopStoreState>()((set) => ({
    history,
    historyIndex: at,
    editError: null,
    goToHistory: (index) => {
      moves.push(index);
      set((s) => (Number.isInteger(index) && index >= 0 && index < s.history.length ? { historyIndex: index } : {}));
    },
  }));
  const api: SafelightAPI = {
    version: 1,
    extensionId: "history",
    react: React,
    registerPanel: (c) => void panels.push(c),
    registerStylesheet: (c) => void stylesheets.push(c),
    ui: { tokens: TOKENS },
    params: { get: (key) => descriptors[key] },
    stores: { useDevelopStore: develop },
  };
  return { api, develop, moves, panels, stylesheets };
}
