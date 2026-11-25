# History for Safelight

A Develop **History** panel in two tabs:

- **Global:** every step of the photo you are editing, oldest first, from the
  photo as opened to your latest change.
- **Local:** only the steps one extension made, such as Basic or HSL. The
  dropdown follows the extension you edited last; pick another to see its
  steps instead, until you edit with a different one. Clicking a local step
  moves only that extension's settings back or forward, as a new step, and
  keeps every other tool's later edits.

On the Global tab:

- **Go to any step:** click it. The photo shows the edit as it was after that
  step, the same as pressing Undo or Redo that many times, but in one move.
- **The steps after it stay**, dimmed, so you can go forward again, until you
  make a new change. That change starts a new step and drops the dimmed ones,
  as Undo and Redo always do.
- **What each step changed** shows beside it: how far a single slider moved,
  or how many settings changed. Hover a step for the full list, such as
  "Exposure: 0 → 0.5" or "Mask “Sky” edited". To keep the list to labels
  alone, turn off **Show what each step changed** in Preferences ▸
  Extensions ▸ History; hovering a step still lists its changes.

The tab you pick is remembered. Masks move as a whole on the Local tab: going
back on Basic after it changed a mask's exposure puts that mask back as it was.

Both lists are the photo's own undo history, so they agree with Undo and Redo,
the keyboard shortcuts and other windows, and keep as many steps as Safelight
keeps. Safelight records which extension made each step from 3.2.8 on, so
steps made before then show only on the Global tab. The extension stores
nothing of its own but the tab: it works out what changed between
neighbouring steps and keeps only those differences while you edit.

Needs Safelight 3.2.8 or later.

## Development

```bash
npm install
npm run typecheck
npm run build    # dist/index.js, the file Safelight loads
npm test         # vitest; the bundle checks read dist/, so build first
npm run check    # all three, in that order
```

Safelight hands the extension its own React through `api.react`, so the
bundle never includes React. `src/safelight.d.ts` mirrors the part of the
app's extension API the extension uses.

## Licence

GPL-3.0-only with an attribution term (GPL v3 §7b), the same licence as Safelight; see LICENSE. Copyright (C) 2026 Anthony Reimche.
