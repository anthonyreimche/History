// Safelight — founded and principally authored by Anthony Reimche.
// Copyright (C) 2026 Anthony Reimche. Licensed under the GNU GPL v3 with an
// attribution-preservation term (GPL v3 §7b) — see LICENSE. This notice must
// be preserved in derived versions.

// The History panel, in two tabs. Global: every step of the open photo's edit,
// oldest first, read from core's own history, so undo, redo and this list
// always agree. Local: the steps one extension made, read from core's local
// history; going to one moves only that extension's settings.

import { stepChanges } from "./diff";
import { describeStep, stepDetail } from "./format";
import { React, api } from "./rt";
import type { EditSnapshot, LocalHistoryView, UiTokens } from "./safelight";
import { useSetting, useShowChanges } from "./settings";

export const TABS_CLASS = "history-panel-tabs";
export const LIST_CLASS = "history-panel-list";
export const ROW_CLASS = "history-panel-step";
export const LABEL_CLASS = "history-panel-label";
export const DETAIL_CLASS = "history-panel-detail";
export const EMPTY_CLASS = "history-panel-empty";

/** The stored tab: "global" or "local". */
export const TAB_KEY = "tab";
type Tab = "global" | "local";
type RowState = "current" | "redo" | undefined;

const TABS = [
  { value: "global", label: "Global", title: "The photo's whole history: going to a step undoes or redoes every tool" },
  { value: "local", label: "Local", title: "The steps one extension made: going to a step moves only that extension's settings" },
];

/** The panel's look as plain CSS (the app's Tailwind build never scans an
 *  extension). `:where()` keeps every rule at zero specificity, so a stylesheet
 *  that restyles buttons wins over it. The last rule repeats core's
 *  Accessibility ▸ Larger text rule for 11 px text. */
export function historyCss(t: UiTokens): string {
  return `
:where(.${TABS_CLASS}) { display: flex; flex-direction: column; gap: 0.25rem; padding: 0.25rem 0.25rem 0; }
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
  const editError = useDevelopStore((s) => s.editError);
  const tab = useSetting<Tab>(TAB_KEY, "global");
  const { SegmentedControl } = api.ui;

  if (editError) return <div className={EMPTY_CLASS}>This photo's history couldn't be read.</div>;
  if (history.length === 0) return <div className={EMPTY_CLASS}>No photo open</div>;

  return (
    <div>
      <div className={TABS_CLASS}>
        <SegmentedControl size="sm" value={tab} onChange={(value) => api.settings.set(TAB_KEY, value)} options={TABS} />
        {tab === "local" && <LocalPicker />}
      </div>
      {tab === "local" ? <LocalSteps history={history} /> : <GlobalSteps history={history} />}
    </div>
  );
}

function GlobalSteps({ history }: { history: readonly EditSnapshot[] }) {
  const historyIndex = api.stores.useDevelopStore((s) => s.historyIndex);
  const goToHistory = api.stores.useDevelopStore((s) => s.goToHistory);
  const shownRef = useKeptInView(history, historyIndex);
  return (
    <ol className={LIST_CLASS} aria-label="Edit history">
      {history.map((step, i) => (
        <StepRow
          key={i}
          ref={i === historyIndex ? shownRef : undefined}
          history={history}
          index={i}
          label={step.label}
          state={i === historyIndex ? "current" : i > historyIndex ? "redo" : undefined}
          onClick={() => goToHistory(i)}
        />
      ))}
    </ol>
  );
}

/** The extension whose steps the Local tab shows: the latest edited, or the one picked. */
function LocalPicker() {
  const { Select } = api.ui;
  const sources = api.develop.useHistorySources();
  const local = api.develop.useLocalHistory(api.develop.useChosenHistorySource());
  if (!local) return null;
  const listed = sources.some((s) => s.id === local.source) ? sources : [{ id: local.source, name: local.name }, ...sources];
  return (
    <Select
      ariaLabel="Extension"
      title="Whose steps to show: the extension edited last, until you pick another"
      value={local.source}
      onChange={(id) => api.develop.chooseHistorySource(id)}
      options={listed.map((s) => ({ value: s.id, label: s.name }))}
    />
  );
}

function LocalSteps({ history }: { history: readonly EditSnapshot[] }) {
  const local = api.develop.useLocalHistory(api.develop.useChosenHistorySource());
  const goToLocalHistory = api.stores.useDevelopStore((s) => s.goToLocalHistory);
  const shownRef = useKeptInView(local, local?.cursor);
  if (!local) return <div className={EMPTY_CLASS}>No extension has changed this photo yet</div>;
  const go = (position: number) => void goToLocalHistory(local.source, position);
  return (
    <ol className={LIST_CLASS} aria-label={`${local.name} history`}>
      <StepRow
        ref={local.cursor === -1 ? shownRef : undefined}
        history={history}
        index={0}
        label={history[0].label}
        title={`${local.name} before its first step`}
        state={local.cursor === -1 ? "current" : undefined}
        onClick={() => go(-1)}
      />
      {local.steps.map((step, i) => (
        <StepRow
          key={step.index}
          ref={i === local.cursor ? shownRef : undefined}
          history={history}
          index={step.index}
          label={step.label}
          state={localState(local, i)}
          onClick={() => go(i)}
        />
      ))}
    </ol>
  );
}

const localState = (local: LocalHistoryView, i: number): RowState =>
  i === local.cursor ? "current" : i > local.cursor ? "redo" : undefined;

/** A ref for the shown step's row, scrolled into view whenever `list` or `shown` change. */
function useKeptInView(list: unknown, shown: unknown): React.RefObject<HTMLButtonElement | null> {
  const shownRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    shownRef.current?.scrollIntoView({ block: "nearest" });
  }, [list, shown]);
  return shownRef;
}

/** A step: its label, what it changed beside it, and the changes in full on
 *  hover (or `title` in their place). */
function StepRow({
  ref,
  history,
  index,
  label,
  title,
  state,
  onClick,
}: {
  ref?: React.Ref<HTMLButtonElement>;
  history: readonly EditSnapshot[];
  index: number;
  label: string;
  title?: string;
  state: RowState;
  onClick: () => void;
}) {
  const showChanges = useShowChanges();
  const describe = (key: string) => api.params.get(key);
  const changes = stepChanges(history, index);
  return (
    <li>
      <button
        ref={ref}
        className={ROW_CLASS}
        aria-current={state === "current" ? "step" : undefined}
        data-state={state === "redo" ? "redo" : undefined}
        title={title ?? describeStep(index, changes, describe)}
        onClick={onClick}
      >
        <span className={LABEL_CLASS}>{label}</span>
        {showChanges && <span className={DETAIL_CLASS}>{stepDetail(changes, describe)}</span>}
      </button>
    </li>
  );
}
