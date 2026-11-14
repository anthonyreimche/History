// The History panel in a DOM, over a real zustand develop store: every step of
// the open photo's history, oldest first, the one shown marked, the ones after
// it dimmed, a click going to a step, and the list following history changes
// made anywhere else (undo, redo, a new commit).

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DETAIL_CLASS, EMPTY_CLASS, HistoryPanel, ROW_CLASS } from "../src/HistoryPanel";
import { React, initRuntime } from "../src/rt";
import type { EditSnapshot } from "../src/safelight";
import { fakeApi, snapshot, type Rig } from "./support/fake-api";

const HISTORY: EditSnapshot[] = [
  snapshot("Original", { exposure: 0, contrast: 0 }),
  snapshot("Exposure", { exposure: 0.5, contrast: 0 }),
  snapshot("Contrast", { exposure: 0.5, contrast: 20 }),
  snapshot("Preset", { exposure: 1, contrast: 10, tint: 4 }),
];

let scrolled: Element[];

beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: Element) {
    scrolled.push(this);
  });
});

afterEach(cleanup);

function mount(options: Parameters<typeof fakeApi>[0] = {}): Rig {
  const rig = fakeApi(options);
  initRuntime(rig.api);
  render(<HistoryPanel />);
  return rig;
}

const rows = () => [...document.querySelectorAll<HTMLButtonElement>(`.${ROW_CLASS}`)];
const labels = () => rows().map((r) => r.firstChild?.textContent);
const current = () => rows().filter((r) => r.getAttribute("aria-current") === "step");
const dimmed = () => rows().filter((r) => r.dataset.state === "redo").map((r) => r.firstChild?.textContent);

describe("HistoryPanel", () => {
  it("lists every step, oldest first, by the label it was committed under", () => {
    mount({ history: HISTORY });
    expect(labels()).toEqual(["Original", "Exposure", "Contrast", "Preset"]);
    expect(screen.getByRole("list", { name: "Edit history" })).toBeTruthy();
  });

  it("marks the step shown and dims the steps after it, which redo would bring back", () => {
    mount({ history: HISTORY, at: 1 });
    expect(current().map((r) => r.firstChild?.textContent)).toEqual(["Exposure"]);
    expect(dimmed()).toEqual(["Contrast", "Preset"]);
  });

  it("goes to a step when it is clicked, back or forward", () => {
    const rig = mount({ history: HISTORY });
    fireEvent.click(rows()[1]);
    expect(rig.moves).toEqual([1]);
    expect(current()).toEqual([rows()[1]]);
    fireEvent.click(rows()[3]);
    expect(rig.moves).toEqual([1, 3]);
    expect(dimmed()).toEqual([]);
  });

  it("follows undo, redo and new steps made anywhere else", () => {
    const rig = mount({ history: HISTORY });
    act(() => rig.develop.setState({ historyIndex: 2 }));
    expect(current().map((r) => r.firstChild?.textContent)).toEqual(["Contrast"]);
    act(() =>
      rig.develop.setState({
        history: [...HISTORY.slice(0, 3), snapshot("Tint", { exposure: 0.5, contrast: 20, tint: 9 })],
        historyIndex: 3,
      }),
    );
    expect(labels()).toEqual(["Original", "Exposure", "Contrast", "Tint"]);
    expect(dimmed()).toEqual([]);
  });

  it("keeps the step shown in view", () => {
    const rig = mount({ history: HISTORY });
    expect(scrolled.at(-1)).toBe(rows()[3]);
    act(() => rig.develop.setState({ historyIndex: 0 }));
    expect(scrolled.at(-1)).toBe(rows()[0]);
  });

  it("shows what each step changed beside it, and in full on hover", () => {
    mount({ history: HISTORY });
    const details = rows().map((r) => r.querySelector(`.${DETAIL_CLASS}`)?.textContent);
    expect(details).toEqual(["", "+0.5", "+20", "3 changes"]);
    expect(rows()[0].title).toBe("The photo as opened");
    expect(rows()[3].title).toBe("Exposure: 0.5 → 1\nContrast: 20 → 10\nTint: — → 4");
  });

  it("names extension values by their tool and label", () => {
    mount({
      history: [snapshot("Original"), snapshot("Shadows", {}, { "toneeq.shadows": 12 })],
      descriptors: {
        "toneeq.shadows": {
          qualifiedKey: "toneeq.shadows",
          localKey: "shadows",
          stageId: "toneeq",
          stageName: "Tone Equalizer",
          extensionName: "Tone Equalizer",
          default: 0,
          label: "Shadows",
        },
      },
    });
    expect(rows()[1].title).toBe("Tone Equalizer › Shadows: 0 → 12");
  });

  it("says so when no photo is open", () => {
    mount();
    expect(rows()).toEqual([]);
    expect(document.querySelector(`.${EMPTY_CLASS}`)?.textContent).toBe("No photo open");
  });

  it("says so when the photo's history couldn't be read", () => {
    const rig = mount();
    act(() => rig.develop.setState({ editError: "Couldn't read the file." }));
    expect(document.querySelector(`.${EMPTY_CLASS}`)?.textContent).toBe("This photo's history couldn't be read.");
  });
});
