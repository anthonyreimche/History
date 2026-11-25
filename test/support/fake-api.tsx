// A stand-in Safelight API over real React and zustand. The develop store holds
// an edit history the way core's does, goToHistory moves through it as core's
// does (and is recorded), and so is every registration. Settings persist in a
// map and tell onChange listeners, as core's do. Local history is read from
// each step's `source` and `local` as core reads it; a local move is recorded,
// not made. The kit's Select and SegmentedControl are plain HTML stand-ins.

import * as React from "react";
import { create } from "zustand";
import type {
  DevelopStoreState,
  EditSnapshot,
  LocalHistoryView,
  LocalStep,
  PanelContribution,
  ParamDescriptor,
  SafelightAPI,
  SettingsContribution,
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
  /** Every goToLocalHistory call, in order. */
  localMoves: [source: string, position: number][];
  /** What chooseHistorySource picked, null when following the latest. */
  pin: StoreApi<{ pin: string | null }>;
  panels: PanelContribution[];
  stylesheets: StylesheetContribution[];
  settingsSections: SettingsContribution[];
}

export const snapshot = (
  label: string,
  params: EditSnapshot["params"] = {},
  paramBag: EditSnapshot["paramBag"] = {},
  extra: Partial<EditSnapshot> = {},
): EditSnapshot => ({ timestamp: 0, label, params, paramBag, ...extra });

/** Core's reading of one extension's steps (local-history.ts). */
function readLocal(history: readonly EditSnapshot[], at: number, source: string): Omit<LocalHistoryView, "name"> {
  let steps: LocalStep[] = [];
  let cursor = -1;
  for (let index = 1; index <= at && index < history.length; index++) {
    const step = history[index];
    if (step.source !== source) continue;
    if (step.local) {
      cursor = step.local.to === null ? -1 : steps.findIndex((s) => s.index === step.local?.to);
    } else {
      steps = [...steps.slice(0, cursor + 1), { index, label: step.label, timestamp: step.timestamp }];
      cursor = steps.length - 1;
    }
  }
  return { source, steps, cursor };
}

function sourcesOf(history: readonly EditSnapshot[], at: number): string[] {
  const seen = new Set<string>();
  for (let index = Math.min(at, history.length - 1); index > 0; index--) {
    const source = history[index].source;
    if (source) seen.add(source);
  }
  return [...seen];
}

/** A develop store holding `history`, showing step `at` (the newest unless
 *  told). With no history, no photo is open: index -1, as core starts. */
export function fakeApi({
  history = [],
  at = history.length - 1,
  descriptors = {},
  settings = {},
  names = {},
}: {
  history?: EditSnapshot[];
  at?: number;
  descriptors?: Record<string, ParamDescriptor>;
  settings?: Record<string, unknown>;
  /** Extension names by id; an id without one is shown as itself. */
  names?: Record<string, string>;
} = {}): Rig {
  const moves: number[] = [];
  const localMoves: [string, number][] = [];
  const pin: StoreApi<{ pin: string | null }> = create<{ pin: string | null }>()(() => ({ pin: null }));
  const nameOf = (id: string) => names[id] ?? id;
  const panels: PanelContribution[] = [];
  const stylesheets: StylesheetContribution[] = [];
  const settingsSections: SettingsContribution[] = [];
  const stored = new Map(Object.entries(settings));
  const listeners = new Set<(key: string, value: unknown) => void>();
  const develop: StoreApi<DevelopStoreState> = create<DevelopStoreState>()((set) => ({
    history,
    historyIndex: at,
    editError: null,
    goToHistory: (index) => {
      moves.push(index);
      set((s) => (Number.isInteger(index) && index >= 0 && index < s.history.length ? { historyIndex: index } : {}));
    },
    goToLocalHistory: async (source, position) => void localMoves.push([source, position]),
  }));
  const api: SafelightAPI = {
    version: 1,
    extensionId: "history",
    react: React,
    registerPanel: (c) => void panels.push(c),
    registerStylesheet: (c) => void stylesheets.push(c),
    registerSettings: (c) => void settingsSections.push(c),
    settings: {
      get: <T,>(key: string, fallback: T) => (stored.has(key) ? (stored.get(key) as T) : fallback),
      set: (key, value) => {
        stored.set(key, value);
        listeners.forEach((listener) => listener(key, value));
      },
      onChange: (listener) => {
        listeners.add(listener);
        return () => void listeners.delete(listener);
      },
    },
    ui: {
      tokens: TOKENS,
      SegmentedControl: ({ value, onChange, options }) => (
        <div role="group">
          {options.map((o) => (
            <button key={o.value} type="button" title={o.title} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
              {o.label}
            </button>
          ))}
        </div>
      ),
      Select: ({ value, onChange, options = [], ariaLabel, title }) => (
        <select aria-label={ariaLabel} title={title} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ),
    },
    params: { get: (key) => descriptors[key] },
    stores: { useDevelopStore: develop },
    develop: {
      useLocalHistory: (source) => {
        const history = develop((s) => s.history);
        const at = develop((s) => s.historyIndex);
        return React.useMemo(
          () => (source ? { ...readLocal(history, at, source), name: nameOf(source) } : null),
          [history, at, source],
        );
      },
      useHistorySources: () => {
        const history = develop((s) => s.history);
        const at = develop((s) => s.historyIndex);
        return React.useMemo(() => sourcesOf(history, at).map((id) => ({ id, name: nameOf(id) })), [history, at]);
      },
      useChosenHistorySource: () => {
        const history = develop((s) => s.history);
        const at = develop((s) => s.historyIndex);
        const picked = pin((s) => s.pin);
        return picked ?? sourcesOf(history, at)[0] ?? null;
      },
      chooseHistorySource: (source) => pin.setState({ pin: source }),
    },
  };
  return { api, develop, moves, localMoves, pin, panels, stylesheets, settingsSections };
}
