// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// The History section of Preferences ▸ Extensions, and the panel's live read
// of it.

import { React, api } from "./rt";
import type { SettingsContribution } from "./safelight";

export const SHOW_CHANGES_KEY = "showChanges";

export const HISTORY_SETTINGS: SettingsContribution = {
  title: "History",
  fields: [
    {
      key: SHOW_CHANGES_KEY,
      label: "Show what each step changed",
      hint: "Beside each step: how far a slider moved, or how many settings changed, such as “602 changes”. Hovering a step lists them either way.",
      type: "boolean",
      default: true,
    },
  ],
};

/** Whether the list shows each step's changes beside it, following the
 *  Preferences toggle as it is flipped in any window. */
export function useShowChanges(): boolean {
  return React.useSyncExternalStore(
    (notify) => api.settings.onChange((key) => key === SHOW_CHANGES_KEY && notify()),
    () => api.settings.get(SHOW_CHANGES_KEY, true),
  );
}
