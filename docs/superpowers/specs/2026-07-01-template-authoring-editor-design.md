# Template authoring editor — design spec

Date: 2026-07-01
Scope: `src/components/DoctorInstructionsCard/templates/ProseTemplateCard.tsx`,
`src/components/DoctorInstructionsCard/editor/nodes/TemplateNode.ts`,
`src/components/DoctorInstructionsCard/editor/nodes/TemplateNodeView.tsx`,
`src/components/DoctorInstructionsCard/styles/prose-template.css`

## Problem

`ProseTemplateCard` today is a **fill** surface: the template's structure
(headings, static text, which fields exist) is fixed at authoring time in
`templates.ts` / `customTemplates.ts`. A doctor can type into blanks and pick
from dropdowns, but cannot change the template's shape while writing a note.

This spec adds an **authoring** mode on top of the existing fill mode: while
writing a note, a doctor can edit a template's text in place, remove a
variable field, insert a new one, and drag the whole template block
elsewhere in the note — without leaving the note or opening a separate form.

## Scope boundary — instance edits, not global templates

Edits made in authoring mode change **this one instance of the template in
this note only**. They do not rewrite the shared template definition in
`templates.ts` / `customTemplates.ts`. This matches how the rest of the
editor already works (values are stored per node instance) and avoids one
doctor's wording tweak silently changing the template for every future note.

Mechanism: `templateBlock` gains an optional `overrides` attribute — a
per-instance copy of `prose` blocks. When present, the node view renders
`overrides` instead of the base template's `prose`. The first structural
edit (text change, field add, field remove) creates the override by deep-
cloning the base `prose`; all further edits mutate it. `values` (the filled-
in answers) continue to work unchanged against whatever `prose` shape
(base or override) is currently rendering.

## Interaction design

Three states, one template card at a time:

**Read** (default)
- Renders exactly as today.
- On hover: a ghost pencil button fades in at the top-right corner; the
  card's cursor becomes `grab` (draggable from read state, not just edit
  state).

**Editing** (entered by clicking the pencil; only this card enters edit mode)
- Card border/shadow lifts to a teal-tinted "live" treatment.
- A slim toolbar attaches above the card: drag grip (⋮⋮) · **+ Field** ·
  **Done**.
- Heading, sub-heading (block `heading`), and static text (`ProseTextPart`)
  become `contentEditable` in place, edits committed on blur/input.
- Each variable field (`ProseFieldPart`) renders as a chip
  (`{field_label}`) with a **×** that removes it; removing reflows the
  surrounding text with no gap.
- **+ Field** inserts a new chip at the current text cursor position, in an
  active "naming" state — the doctor types a label inline and presses Enter
  to commit (no separate popover). The typed label is both what's displayed
  and, slugified (lowercase, spaces to underscores, stripped of anything
  non-alphanumeric), the field's `f` key used to look up its value — e.g.
  "Na Dialysate" becomes `f: "na_dialysate"`. If the slug collides with an
  existing field id in this template instance, append `_2`, `_3`, etc. New
  fields default to kind `'num'` (plain blank) since that is the variable
  type this spec covers.
- **Done** (or clicking outside) exits back to read state and persists the
  override via `updateAttributes`.

**Dragging** (native ProseMirror node drag, available from read or edit
state via the grip)
- `TemplateNode.draggable` flips to `true`; drag start dims the block to
  ~55% opacity, cursor becomes `grabbing`.
- ProseMirror's native drop-cursor shows a teal insertion line at the
  candidate drop position; releasing moves the node there. This is native
  ProseMirror document reordering — no drag library needed since the block
  already lives inside the ProseMirror doc.

## Out of scope

- Changing field *kind* (pick/multi/long) via the UI — new fields are
  always a plain blank; changing an existing field's kind is not covered.
- Editing the shared template definition / template library.
- Any change to the light preview/print modal.
- Test framework setup — this repo has none; verification is manual via the
  browser preview, matching how the rest of the codebase is checked today.

## Accessibility

- Chips have `aria-label` naming the field; × buttons are keyboard-reachable
  and have their own `aria-label` ("Remove field").
- Pencil, +Field, Done, and drag grip all get visible `:focus-visible`
  rings.
- All new transitions get a `prefers-reduced-motion: reduce` fallback
  (instant/crossfade), consistent with the rest of `prose-template.css`.

## Visual language

Reuses the existing warm-dark token set in `prose-template.css`
(`--tp-teal`, `--tp-bg-2/3`, `--tp-line-2`, etc.) — no new colors. The
"editing" lift uses `--tp-teal` at low opacity for the border, matching the
pick-chip family already in the file.
