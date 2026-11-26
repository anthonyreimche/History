// What activate() registers: the History panel in Develop's left rail, its
// Preferences toggle, and the stylesheet that gives it the app's look.

import { describe, expect, it } from "vitest";
import { HistoryPanel, ROW_CLASS } from "../src/HistoryPanel";
import { PANEL_ID, STYLESHEET_ID, activate } from "../src/index";
import { SHOW_CHANGES_KEY } from "../src/settings";
import { fakeApi } from "./support/fake-api";

describe("activate", () => {
  it("registers the History panel in Develop", () => {
    const rig = fakeApi();
    activate(rig.api);
    expect(rig.panels).toEqual([
      {
        id: "history.panel",
        title: "History",
        component: HistoryPanel,
        defaultDock: { module: "develop", direction: "left", order: 3, width: 240, height: 220 },
        modules: ["develop"],
      },
    ]);
    expect(PANEL_ID).toBe("history.panel");
  });

  it("registers a Preferences toggle for what each step changed, on unless turned off", () => {
    const rig = fakeApi();
    activate(rig.api);
    expect(rig.settingsSections).toHaveLength(1);
    expect(rig.settingsSections[0].fields).toEqual([
      expect.objectContaining({ key: SHOW_CHANGES_KEY, type: "boolean", default: true }),
    ]);
    expect(rig.settingsSections[0].fields[0].hint).toContain("602 changes");
  });

  it("registers one stylesheet for the panel's classes, coloured from the theme tokens", () => {
    const rig = fakeApi();
    activate(rig.api);
    expect(rig.stylesheets.map((s) => s.id)).toEqual([STYLESHEET_ID]);
    const css = rig.stylesheets[0].css;
    expect(css).toContain(`:where(.${ROW_CLASS}) {`);
    expect(css).toContain("color: var(--color-text-secondary)");
    expect(css).toContain(`:where(.${ROW_CLASS}[aria-current="step"])`);
    expect(css).toContain("var(--color-accent)");
  });

  it("keeps its rules at zero specificity, below any stylesheet that restyles buttons", () => {
    const rig = fakeApi();
    activate(rig.api);
    const rules = rig.stylesheets[0].css.split("\n").filter((line) => line.includes(ROW_CLASS));
    const plain = rules.filter((line) => !line.includes(":where(") && !line.startsWith("html.sl-larger-text"));
    expect(plain).toEqual([]);
  });
});
