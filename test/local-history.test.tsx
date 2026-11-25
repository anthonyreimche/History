// The History panel's two tabs: Global, the photo's whole history, and Local,
// the steps one extension made, picked from a dropdown that follows the latest
// edited extension. A click on a local step moves only that extension's
// settings, through core's goToLocalHistory.

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DETAIL_CLASS, EMPTY_CLASS, HistoryPanel, ROW_CLASS, TAB_KEY } from "../src/HistoryPanel";
import { React, initRuntime } from "../src/rt";
import type { EditSnapshot } from "../src/safelight";
import { fakeApi, snapshot, type Rig } from "./support/fake-api";

const HISTORY: EditSnapshot[] = [
  snapshot("Original", { exposure: 0, contrast: 0, saturation: 0 }),
  snapshot("Exposure", { exposure: 0.5, contrast: 0, saturation: 0 }, {}, { source: "basic" }),
  snapshot("Saturation", { exposure: 0.5, contrast: 0, saturation: 10 }, {}, { source: "hsl" }),
  snapshot("Contrast", { exposure: 0.5, contrast: 20, saturation: 10 }, {}, { source: "basic" }),
  snapshot("Undo Contrast", { exposure: 0.5, contrast: 0, saturation: 10 }, {}, { source: "basic", local: { to: 1 } }),
];
const NAMES = { basic: "Basic", hsl: "HSL" };

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(cleanup);

function mount(options: Parameters<typeof fakeApi>[0] = {}): Rig {
  const rig = fakeApi({ names: NAMES, ...options });
  initRuntime(rig.api);
  render(<HistoryPanel />);
  return rig;
}

const rows = () => [...document.querySelectorAll<HTMLButtonElement>(`.${ROW_CLASS}`)];
const labels = () => rows().map((r) => r.firstChild?.textContent);
const current = () => rows().filter((r) => r.getAttribute("aria-current") === "step").map((r) => r.firstChild?.textContent);
const dimmed = () => rows().filter((r) => r.dataset.state === "redo").map((r) => r.firstChild?.textContent);
const tab = (name: "Global" | "Local") => screen.getByRole("button", { name });
const picker = () => screen.getByRole("combobox", { name: "Extension" }) as HTMLSelectElement;

describe("the tabs", () => {
  it("opens on Global, the photo's whole history", () => {
    mount({ history: HISTORY });
    expect(tab("Global").getAttribute("aria-pressed")).toBe("true");
    expect(labels()).toEqual(["Original", "Exposure", "Saturation", "Contrast", "Undo Contrast"]);
    expect(screen.getByRole("list", { name: "Edit history" })).toBeTruthy();
  });

  it("explains each tab on hover", () => {
    mount({ history: HISTORY });
    expect(tab("Global").title).toMatch(/whole history/);
    expect(tab("Local").title).toMatch(/one extension/);
  });

  it("remembers the tab picked, the next time the panel opens", () => {
    const rig = mount({ history: HISTORY });
    fireEvent.click(tab("Local"));
    expect(rig.api.settings.get(TAB_KEY, "global")).toBe("local");
    cleanup();
    render(<HistoryPanel />);
    expect(tab("Local").getAttribute("aria-pressed")).toBe("true");
  });
});

describe("the Local tab", () => {
  const local = (options: Parameters<typeof fakeApi>[0] = {}) =>
    mount({ history: HISTORY, settings: { [TAB_KEY]: "local" }, ...options });

  it("shows the latest edited extension's steps after its Original, standing where its last move left it", () => {
    local();
    expect(picker().value).toBe("basic");
    expect(labels()).toEqual(["Original", "Exposure", "Contrast"]);
    expect(current()).toEqual(["Exposure"]);
    expect(dimmed()).toEqual(["Contrast"]);
    expect(screen.getByRole("list", { name: "Basic history" })).toBeTruthy();
  });

  it("offers every extension with steps, by name, and shows the one picked", () => {
    const rig = local();
    expect([...picker().options].map((o) => o.textContent)).toEqual(["Basic", "HSL"]);
    fireEvent.change(picker(), { target: { value: "hsl" } });
    expect(rig.pin.getState().pin).toBe("hsl");
    expect(labels()).toEqual(["Original", "Saturation"]);
    expect(current()).toEqual(["Saturation"]);
  });

  it("moves only that extension's settings when a step is clicked", () => {
    const rig = local();
    fireEvent.click(rows()[2]);
    fireEvent.click(rows()[0]);
    expect(rig.localMoves).toEqual([
      ["basic", 1],
      ["basic", -1],
    ]);
    expect(rig.moves).toEqual([]);
  });

  it("shows what each of its steps changed", () => {
    local();
    const details = rows().map((r) => r.querySelector(`.${DETAIL_CLASS}`)?.textContent);
    expect(details).toEqual(["", "+0.5", "+20"]);
    expect(rows()[2].title).toBe("Contrast: 0 → 20");
    expect(rows()[0].title).toBe("Basic before its first step");
  });

  it("follows new steps made anywhere else", () => {
    const rig = local();
    act(() =>
      rig.develop.setState({
        history: [...HISTORY, snapshot("Hue", {}, {}, { source: "hsl" })],
        historyIndex: HISTORY.length,
      }),
    );
    expect(picker().value).toBe("hsl");
    expect(labels()).toEqual(["Original", "Saturation", "Hue"]);
  });

  it("says so when no extension has made a step", () => {
    local({ history: [snapshot("Original"), snapshot("Reset")] });
    expect(rows()).toEqual([]);
    expect(document.querySelector(`.${EMPTY_CLASS}`)?.textContent).toBe("No extension has changed this photo yet");
  });

  it("says so when no photo is open", () => {
    mount({ settings: { [TAB_KEY]: "local" } });
    expect(document.querySelector(`.${EMPTY_CLASS}`)?.textContent).toBe("No photo open");
  });
});
