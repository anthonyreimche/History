// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// Registers the Develop "History" panel: every step of the open photo's edit,
// to go back or forward to, and its toggle in Preferences ▸ Extensions.

import { HistoryPanel, historyCss } from "./HistoryPanel";
import { initRuntime } from "./rt";
import { HISTORY_SETTINGS } from "./settings";
import type { SafelightAPI } from "./safelight";

export const EXTENSION_ID = "history";
export const PANEL_ID = `${EXTENSION_ID}.panel`;
export const STYLESHEET_ID = `${EXTENSION_ID}.styles`;

export function activate(host: SafelightAPI): void {
  initRuntime(host);
  host.registerStylesheet({ id: STYLESHEET_ID, css: historyCss(host.ui.tokens) });
  host.registerSettings(HISTORY_SETTINGS);
  host.registerPanel({
    id: PANEL_ID,
    title: "History",
    component: HistoryPanel,
    defaultDock: { module: "develop", direction: "left", order: 3, width: 240, height: 220 },
    modules: ["develop"],
  });
}
