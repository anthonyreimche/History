// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// The slice of Safelight's extension API this extension touches, mirrored from
// the app's extension-types/safelight.d.ts. Extensions are standalone bundles,
// so the host's source is not on the type path; React types come from
// @types/react (dev only).

import type { ComponentType } from "react";

export interface StoreApi<T> {
  (): T;
  <U>(selector: (state: T) => U): U;
  getState(): T;
  setState(partial: Partial<T> | ((s: T) => Partial<T>)): void;
  subscribe(listener: (state: T, prev: T) => void): () => void;
}

/** A mask as this extension reads it: told apart by id, named for the list. */
export interface MaskLike {
  id: string;
  name: string;
}

/** One step of the open photo's edit history: the whole edit after the step.
 *  Core types `params` as DevelopParams, but a snapshot read from disk carries
 *  whatever params the build that wrote it knew, so they are read by key here. */
export interface EditSnapshot {
  timestamp: number;
  label: string;
  params: Readonly<Record<string, unknown>> & { masks?: readonly MaskLike[] };
  /** Extension stage params by qualified key ("{stageId}.{key}"). */
  paramBag?: Readonly<Record<string, unknown>>;
}

export interface DevelopStoreState {
  /** The open photo's edit history, oldest first; empty with no photo open. */
  history: readonly EditSnapshot[];
  /** The step the photo shows now; -1 with no photo open. */
  historyIndex: number;
  /** Why the open photo's stored edit couldn't be read, or null. */
  editError: string | null;
  /** Show history[index] as one move, like a single undo (Safelight 3.2.5). */
  goToHistory(index: number): void;
}

/** What core knows about one extension stage param. */
export interface ParamDescriptor {
  qualifiedKey: string;
  localKey: string;
  stageId: string;
  stageName: string;
  extensionName: string;
  /** The value a stage reads while the edit holds none. */
  default: number | readonly number[] | boolean;
  label?: string;
}

export interface PanelDockDefault {
  module: "library" | "develop";
  direction: "left" | "right" | "bottom";
  order?: number;
  width?: number;
  height?: number;
}

export interface PanelContribution {
  id: string;
  title: string;
  component: ComponentType;
  defaultDock?: PanelDockDefault;
}

/** A stylesheet applied to every app window after the core styles. */
export interface StylesheetContribution {
  id: string;
  css: string;
}

/** An on/off field in the extension's Preferences ▸ Extensions section. */
export interface BooleanSettingsField {
  key: string;
  label: string;
  hint?: string;
  type: "boolean";
  default: boolean;
}

/** The extension's section in Preferences ▸ Extensions. */
export interface SettingsContribution {
  title?: string;
  fields: BooleanSettingsField[];
  order?: number;
}

/** The theme's CSS variables as `var(--color-…)` strings. */
export interface UiTokens {
  readonly surface3: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly accent: string;
}

export interface SafelightAPI {
  version: 1;
  extensionId: string;
  react: typeof import("react");
  registerPanel(c: PanelContribution): void;
  registerStylesheet(c: StylesheetContribution): void;
  registerSettings(c: SettingsContribution): void;
  /** Persisted per-extension values, as set in Preferences ▸ Extensions. */
  settings: {
    get<T>(key: string, fallback: T): T;
    set(key: string, value: unknown): void;
    /** Fires when any of this extension's settings change (any window). */
    onChange(cb: (key: string, value: unknown) => void): () => void;
  };
  ui: { tokens: UiTokens };
  params: {
    get(qualifiedKey: string): ParamDescriptor | undefined;
  };
  stores: {
    useDevelopStore: StoreApi<DevelopStoreState>;
  };
}

export interface ExtensionModule {
  activate(api: SafelightAPI): void;
  deactivate?(): void;
}
