// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// What one step of the edit history changed. Core's history holds the whole edit
// after each step and stays the only record of it; this extension keeps nothing
// but the difference between neighbouring steps, worked out once per pair.

import type { EditSnapshot, MaskLike } from "./safelight";

/** A core setting ("param") or an extension value ("bag", by qualified key). */
export interface SettingChange {
  kind: "param" | "bag";
  key: string;
  before: unknown;
  after: unknown;
}

export interface MaskChange {
  kind: "mask";
  id: string;
  name: string;
  change: "added" | "removed" | "edited";
}

export type StepChange = SettingChange | MaskChange;

/** Every setting, extension value and mask that differs from `prev` to `next`:
 *  in `next`'s order, then what only `prev` held. */
export function diffSnapshots(prev: EditSnapshot, next: EditSnapshot): StepChange[] {
  const { masks: prevMasks = [], ...prevParams } = prev.params;
  const { masks: nextMasks = [], ...nextParams } = next.params;
  return [
    ...diffValues("param", prevParams, nextParams),
    ...diffMasks(prevMasks, nextMasks),
    ...diffValues("bag", prev.paramBag ?? {}, next.paramBag ?? {}),
  ];
}

const held = new WeakMap<EditSnapshot, { prev: EditSnapshot; changes: readonly StepChange[] }>();

/** What `history[index]` changed from the step before it; nothing for the first
 *  step, the photo as opened. Core keeps a step's snapshot object as new steps
 *  are added, so each difference is worked out once and held against it. */
export function stepChanges(history: readonly EditSnapshot[], index: number): readonly StepChange[] {
  if (index <= 0) return [];
  const prev = history[index - 1];
  const next = history[index];
  const kept = held.get(next);
  if (kept?.prev === prev) return kept.changes;
  const changes = diffSnapshots(prev, next);
  held.set(next, { prev, changes });
  return changes;
}

function diffValues(
  kind: "param" | "bag",
  prev: Readonly<Record<string, unknown>>,
  next: Readonly<Record<string, unknown>>,
): StepChange[] {
  const keys = new Set([...Object.keys(next), ...Object.keys(prev)]);
  return [...keys]
    .filter((key) => !sameValue(prev[key], next[key]))
    .map((key) => ({ kind, key, before: prev[key], after: next[key] }));
}

function diffMasks(prev: readonly MaskLike[], next: readonly MaskLike[]): StepChange[] {
  const before = new Map(prev.map((m) => [m.id, m]));
  const after = new Set(next.map((m) => m.id));
  const changes: StepChange[] = [];
  for (const mask of next) {
    const was = before.get(mask.id);
    if (!was) changes.push({ kind: "mask", id: mask.id, name: mask.name, change: "added" });
    else if (!sameValue(was, mask)) changes.push({ kind: "mask", id: mask.id, name: mask.name, change: "edited" });
  }
  for (const mask of prev) {
    if (!after.has(mask.id)) changes.push({ kind: "mask", id: mask.id, name: mask.name, change: "removed" });
  }
  return changes;
}

/** Equal as stored values: numbers by value (0 and -0 alike, NaN as itself),
 *  arrays item by item, objects key by key. */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b || (Number.isNaN(a) && Number.isNaN(b))) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const entries = Object.entries(a);
  const other = new Map(Object.entries(b));
  return entries.length === other.size && entries.every(([key, value]) => other.has(key) && sameValue(value, other.get(key)));
}
