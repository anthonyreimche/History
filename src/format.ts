// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// How a step's changes read in the list: a short detail beside its label, and a
// line per change when it is hovered.

import type { SettingChange, StepChange } from "./diff";
import type { ParamDescriptor } from "./safelight";

export type DescribeParam = (qualifiedKey: string) => ParamDescriptor | undefined;

const MOST_LINES = 12;
const ACRONYMS = new Set(["hsl", "nr", "wb", "ev", "lut", "rgb", "ca"]);

/** "luminanceNRDetail" → "Luminance NR detail", in Canadian spelling. */
export function humanize(key: string): string {
  const words = key
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => (ACRONYMS.has(word.toLowerCase()) ? word.toUpperCase() : word.toLowerCase()))
    .map((word) => word.replace(/^colo(?=r)/, "colou"));
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A setting's name: a core setting from its key, an extension value as
 *  "Tool › Label" from what its extension registered. */
export function settingName(change: SettingChange, describe: DescribeParam): string {
  if (change.kind === "param") return humanize(change.key);
  const descriptor = describe(change.key);
  if (!descriptor) return humanize(change.key.slice(change.key.lastIndexOf(".") + 1));
  const label = descriptor.label ?? humanize(descriptor.localKey);
  return label.startsWith(descriptor.stageName) ? label : `${descriptor.stageName} › ${label}`;
}

/** A change's values as a stage reads them: an extension value the edit holds
 *  none of is at its registered default. */
function values(change: SettingChange, describe: DescribeParam): [before: unknown, after: unknown] {
  if (change.kind === "param") return [change.before, change.after];
  const fallback = describe(change.key)?.default;
  return [change.before ?? fallback, change.after ?? fallback];
}

/** A plain value as shown, or null for a curve, crop or other compound value. */
function shown(value: unknown): string | null {
  if (value === undefined || value === null) return "—";
  if (typeof value === "number") return String(Math.round(value * 100) / 100);
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (typeof value === "string" && value.length <= 24) return value;
  return null;
}

export function describeChange(change: StepChange, describe: DescribeParam): string {
  if (change.kind === "mask") {
    const mask = change.name ? `Mask “${change.name}”` : "Mask";
    return `${mask} ${change.change}`;
  }
  const name = settingName(change, describe);
  const [before, after] = values(change, describe).map(shown);
  return before === null || after === null ? `${name} edited` : `${name}: ${before} → ${after}`;
}

/** Beside a step's label: how far a single number moved, or how many things changed. */
export function stepDetail(changes: readonly StepChange[], describe: DescribeParam): string {
  if (changes.length > 1) return `${changes.length} changes`;
  const [change] = changes;
  if (!change || change.kind === "mask") return "";
  const [before, after] = values(change, describe);
  if (typeof after !== "number") return "";
  if (typeof before !== "number") return shown(after) ?? "";
  const moved = Math.round((after - before) * 100) / 100;
  return moved > 0 ? `+${moved}` : String(moved);
}

/** A step's hover text: a line per change, the rest counted past twelve. */
export function describeStep(index: number, changes: readonly StepChange[], describe: DescribeParam): string {
  if (index === 0) return "The photo as opened";
  if (changes.length === 0) return "No settings changed";
  const lines = changes.slice(0, MOST_LINES).map((change) => describeChange(change, describe));
  if (changes.length > MOST_LINES) lines.push(`and ${changes.length - MOST_LINES} more`);
  return lines.join("\n");
}
