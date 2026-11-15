// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// The History panel: every step of the open photo's edit, oldest first. The
// list reads core's own history, so undo, redo and this list always agree.

import { stepChanges } from "./diff";
import { describeStep, stepDetail } from "./format";
import { React, api } from "./rt";
import type { UiTokens } from "./safelight";

export const LIST_CLASS = "history-panel-list";
export const ROW_CLASS = "history-panel-step";
export const LABEL_CLASS = "history-panel-label";
export const DETAIL_CLASS = "history-panel-detail";
export const EMPTY_CLASS = "history-panel-empty";

/** The panel's look as plain CSS (the app's Tailwind build never scans an
 *  extension). `:where()` keeps every rule at zero specificity, so a stylesheet
 *  that restyles buttons wins over it. The last rule repeats core's
 *  Accessibility ▸ Larger text rule for 11 px text. */
export function historyCss(t: UiTokens): string {
  return `
:where(.${LIST_CLASS}) { list-style: none; margin: 0; padding: 0.25rem; display: flex; flex-direction: column; gap: 1px; max-height: 20rem; overflow-y: auto; }
:where(.${ROW_CLASS}) { display: flex; width: 100%; align-items: baseline; gap: 0.5rem; border-radius: 0.25rem; padding: 0.25rem 0.5rem; background-color: transparent; font-size: 11px; text-align: left; color: ${t.textSecondary}; cursor: pointer; }
@media (hover: hover) { :where(.${ROW_CLASS}:hover) { background-color: ${t.surface3}; color: ${t.textPrimary}; } }
:where(.${ROW_CLASS}[aria-current="step"]) { background-color: ${t.surface3}; color: ${t.textPrimary}; box-shadow: inset 2px 0 0 ${t.accent}; }
:where(.${ROW_CLASS}[data-state="redo"]) { opacity: 0.45; }
:where(.${LABEL_CLASS}) { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
:where(.${DETAIL_CLASS}) { flex: none; color: ${t.textMuted}; font-variant-numeric: tabular-nums; }
:where(.${EMPTY_CLASS}) { padding: 0.5rem; font-size: 11px; color: ${t.textMuted}; }
html.sl-larger-text .${ROW_CLASS}, html.sl-larger-text .${EMPTY_CLASS} { font-size: 13px !important; line-height: 1.45 !important; }
`;
}

export function HistoryPanel() {
  const useDevelopStore = api.stores.useDevelopStore;
  const history = useDevelopStore((s) => s.history);
  const historyIndex = useDevelopStore((s) => s.historyIndex);
  const editError = useDevelopStore((s) => s.editError);
  const goToHistory = useDevelopStore((s) => s.goToHistory);
  const shownStep = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    shownStep.current?.scrollIntoView({ block: "nearest" });
  }, [history, historyIndex]);

  if (editError) return <div className={EMPTY_CLASS}>This photo's history couldn't be read.</div>;
  if (history.length === 0) return <div className={EMPTY_CLASS}>No photo open</div>;

  const describe = (key: string) => api.params.get(key);
  return (
    <ol className={LIST_CLASS} aria-label="Edit history">
      {history.map((step, i) => {
        const changes = stepChanges(history, i);
        return (
          <li key={i}>
            <button
              ref={i === historyIndex ? shownStep : undefined}
              className={ROW_CLASS}
              aria-current={i === historyIndex ? "step" : undefined}
              data-state={i > historyIndex ? "redo" : undefined}
              title={describeStep(i, changes, describe)}
              onClick={() => goToHistory(i)}
            >
              <span className={LABEL_CLASS}>{step.label}</span>
              <span className={DETAIL_CLASS}>{stepDetail(changes, describe)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
