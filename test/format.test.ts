// How a step's changes read in the History list: a short detail beside the
// step's label, and one line per change when the step is hovered.

import { describe, expect, it } from "vitest";
import { describeChange, describeStep, settingName, stepDetail } from "../src/format";
import type { SettingChange } from "../src/diff";
import type { ParamDescriptor } from "../src/safelight";

const DESCRIPTORS: Record<string, ParamDescriptor> = {
  "toneeq.shadows": {
    qualifiedKey: "toneeq.shadows",
    localKey: "shadows",
    stageId: "toneeq",
    stageName: "Tone Equalizer",
    extensionName: "Tone Equalizer",
    default: 0,
    label: "Shadows",
  },
  "glow.radiusPx": {
    qualifiedKey: "glow.radiusPx",
    localKey: "radiusPx",
    stageId: "glow",
    stageName: "Glow",
    extensionName: "Glow",
    default: 1,
  },
  "glow.glowAmount": {
    qualifiedKey: "glow.glowAmount",
    localKey: "glowAmount",
    stageId: "glow",
    stageName: "Glow",
    extensionName: "Glow",
    default: 1,
    label: "Glow amount",
  },
};
const describe_ = (key: string) => DESCRIPTORS[key];

const param = (key: string, before: unknown, after: unknown): SettingChange => ({ kind: "param", key, before, after });
const bag = (key: string, before: unknown, after: unknown): SettingChange => ({ kind: "bag", key, before, after });

describe("settingName", () => {
  it("names core settings from their keys, in Canadian spelling", () => {
    expect(settingName(param("exposure", 0, 1), describe_)).toBe("Exposure");
    expect(settingName(param("luminanceNRDetail", 0, 1), describe_)).toBe("Luminance NR detail");
    expect(settingName(param("colorGrading", 0, 1), describe_)).toBe("Colour grading");
    expect(settingName(param("hsl", 0, 1), describe_)).toBe("HSL");
  });

  it("names extension values by their tool and slider label", () => {
    expect(settingName(bag("toneeq.shadows", 0, 1), describe_)).toBe("Tone Equalizer › Shadows");
  });

  it("drops the tool's name when the label already starts with it", () => {
    expect(settingName(bag("glow.glowAmount", 0, 1), describe_)).toBe("Glow amount");
  });

  it("falls back to the key when a value has no label, or its extension is gone", () => {
    expect(settingName(bag("glow.radiusPx", 0, 1), describe_)).toBe("Glow › Radius px");
    expect(settingName(bag("gone.stage.someValue", 0, 1), describe_)).toBe("Some value");
  });
});

describe("describeChange", () => {
  it("shows a value before and after", () => {
    expect(describeChange(param("exposure", 0, 0.5), describe_)).toBe("Exposure: 0 → 0.5");
    expect(describeChange(bag("toneeq.shadows", -3, 12), describe_)).toBe("Tone Equalizer › Shadows: -3 → 12");
  });

  it("rounds to two decimals", () => {
    expect(describeChange(param("tint", 0.123456, 1 / 3), describe_)).toBe("Tint: 0.12 → 0.33");
  });

  it("shows switches as On and Off, and a value not set as a dash", () => {
    expect(describeChange(param("guidedLines", false, true), describe_)).toBe("Guided lines: Off → On");
    expect(describeChange(param("crop", { x: 0 }, undefined), describe_)).toBe("Crop edited");
    expect(describeChange(bag("gone.stage.amount", undefined, 4), describe_)).toBe("Amount: — → 4");
    expect(describeChange(param("uprightMode", "off", "auto"), describe_)).toBe("Upright mode: off → auto");
  });

  it("shows an extension value not stored yet at its tool's default", () => {
    expect(describeChange(bag("toneeq.shadows", undefined, 4), describe_)).toBe("Tone Equalizer › Shadows: 0 → 4");
    expect(describeChange(bag("toneeq.shadows", 4, undefined), describe_)).toBe("Tone Equalizer › Shadows: 4 → 0");
  });

  it("says a curve, crop or other compound value was edited", () => {
    expect(describeChange(param("toneCurve", { rgb: [] }, { rgb: [1] }), describe_)).toBe("Tone curve edited");
    expect(describeChange(param("crop", undefined, { x: 0 }), describe_)).toBe("Crop edited");
  });

  it("says what happened to a mask", () => {
    expect(describeChange({ kind: "mask", id: "m1", name: "Sky", change: "added" }, describe_)).toBe("Mask “Sky” added");
    expect(describeChange({ kind: "mask", id: "m1", name: "", change: "removed" }, describe_)).toBe("Mask removed");
  });
});

describe("stepDetail", () => {
  it("is empty for a step that changed nothing", () => {
    expect(stepDetail([], describe_)).toBe("");
  });

  it("shows how far a single number moved, signed", () => {
    expect(stepDetail([param("exposure", 0.25, 0.75)], describe_)).toBe("+0.5");
    expect(stepDetail([bag("toneeq.shadows", 10, -2)], describe_)).toBe("-12");
    expect(stepDetail([bag("toneeq.shadows", undefined, 4)], describe_)).toBe("+4");
    expect(stepDetail([bag("gone.stage.amount", undefined, 4)], describe_)).toBe("4");
  });

  it("is empty for a single change that isn't a number", () => {
    expect(stepDetail([param("toneCurve", {}, { rgb: [] })], describe_)).toBe("");
  });

  it("counts several changes", () => {
    expect(stepDetail([param("exposure", 0, 1), param("contrast", 0, 1), param("tint", 0, 1)], describe_)).toBe("3 changes");
  });
});

describe("describeStep", () => {
  it("says the first step is the photo as opened", () => {
    expect(describeStep(0, [], describe_)).toBe("The photo as opened");
  });

  it("says a later step changed nothing it can show", () => {
    expect(describeStep(2, [], describe_)).toBe("No settings changed");
  });

  it("lists a step's changes, one per line, and counts the rest past twelve", () => {
    const changes = Array.from({ length: 14 }, (_, i) => param(`value${i}`, 0, 1));
    const lines = describeStep(3, changes, describe_).split("\n");
    expect(lines).toHaveLength(13);
    expect(lines[0]).toBe("Value0: 0 → 1");
    expect(lines[12]).toBe("and 2 more");
  });
});
