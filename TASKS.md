# Jano Pad — Task List

## Phase 1 · Fix the Broken (highest priority)

### P1-1 · Persist the page title across reloads
- **File**: `src/components/DoctorInstructionsCard/DoctorNotePad.tsx`, `src/components/PageShell/PageShell.tsx`
- **Problem**: The page title lives only in `PageShell` local state. On refresh the editor body restores from localStorage but the title resets to "Untitled Page".
- **Fix**: Include `title` in the autosave draft object written to `localStorage`. Either lift title state up to `App.tsx` and pass it down to both `PageShell` and `DoctorNotePad`, or add a separate `localStorage.setItem('page_title_<patientId>', title)` write and read it back on mount.
- **Done when**: Refresh the page → title that was typed before reload reappears.

---

### P1-2 · Mobile layout is completely broken
- **File**: `src/components/PageShell/pageshell.css`
- **Problem**: Sidebar is fixed at 300px width with no responsive rules. On any screen narrower than ~500px the sidebar fills the whole viewport and the editor is unreachable.
- **Fix**: Add a `@media (max-width: 768px)` breakpoint. On mobile:
  - Sidebar becomes a full-height drawer (position absolute/fixed, z-index above content).
  - Sidebar is hidden by default (`transform: translateX(-100%)`).
  - Toggle button opens/closes it as an overlay.
  - Content area takes full width.
- **Done when**: Open on 375px viewport → editor is immediately visible; sidebar toggle slides it in/out as an overlay.

---

### P1-3 · Sidebar tabs are visual-only (nothing changes when clicked)
- **File**: `src/components/PageShell/PageShell.tsx:33-101`
- **Problem**: `activeTab` state switches between `outline | tasks | files | search` but the sidebar always renders the same hardcoded "Tasks" section + empty placeholder.
- **Fix per tab**:
  - **Outline**: Walk the editor doc for `heading` nodes and list them as a clickable TOC. Requires passing the `editor` instance up from `DoctorNotePad` to `PageShell` (via callback or context).
  - **Tasks**: Keep existing placeholder for now; add a real empty-state illustration.
  - **Files**: Empty state UI with a drag-drop target (no backend needed yet).
  - **Search**: Text input that filters `editor.getText()` and highlights matches using `editor.commands.find()` or a custom approach.
- **Done when**: Clicking each tab shows distinct content in the sidebar panel.

---

## Phase 2 · Structured Template Creation (new feature)

### P2-0 · New "Add Template" flow — description + parameter table → AI → saved template

**What the doctor does:**
1. Clicks **"Add Template"** (new button, replaces or sits alongside the current "Create template").
2. A modal opens with two parts:
   - **Description** — a free-text area where the doctor writes what this template is for (e.g. "Pre-dialysis check for vitals and access site").
   - **Parameters table** — an editable table with three columns:

     | Parameter (Input) | Value | Unit |
     |-------------------|-------|------|
     | Blood Pressure    |       | mmHg |
     | Heart Rate        |       | bpm  |
     | Temperature       |       | °F   |
     | Weight            |       | kg   |
     | Access type       | AVF / AVG / Tunnelled catheter | (select) |

   - Doctor can **add rows** (+ button) and **remove rows** (× per row).
   - The **Unit** column also accepts option lists for select/multiselect fields (comma-separated values or a "(select)" / "(multi)" keyword).
3. Doctor types a **template name** and optional **/ shortcut**.
4. Clicks **Generate** → the description + parameter table is sent to the AI.
5. AI returns a fully structured template object matching our schema (prose blocks + sections with correct `FieldType`).
6. Doctor sees a **preview** of the generated template card (same `ProseTemplateCard` component, rendered read-only with empty fields).
7. Doctor can **edit the raw output** if needed, then clicks **Save template**.
8. Template is saved via `addCustomTemplate()` and immediately appears in the `/` slash menu.

---

**Field type inference rules the AI must follow** (include these explicitly in the AI prompt):

| Unit / hint | FieldType to use | Extra attrs |
|-------------|-----------------|-------------|
| `mmHg` or two-part BP value | `bp` | — |
| `bpm`, `%`, `mg/dL`, `mmol/L`, whole number readings | `digits` | `boxes: 3` |
| `kg`, `L`, `°F`, any decimal reading | `decimal` | `boxes: 3, decimals: 1` |
| `HH:MM` / time | `time` | — |
| Comma-separated options (≤8), marked "(select)" | `select` | `options: [...]` |
| Comma-separated options, marked "(multi)" | `multiselect` | `options: [...]` |
| No unit / free text | `text` | `placeholder: humanized label` |

---

**Files to create / modify:**

| File | Change |
|------|--------|
| `src/components/DoctorInstructionsCard/DoctorNotePad.tsx` | Replace current `openTemplateCreator()` modal with new structured flow; add `ParameterRow` state type |
| `src/components/DoctorInstructionsCard/styles/ai-features.css` | Style the new modal: table, add-row button, preview pane |
| `src/data/customTemplates.ts` | Add `buildTemplateFromStructured(description, rows, meta)` — constructs `prose` + `sections` from the structured AI response instead of from flat text |
| `src/components/DoctorInstructionsCard/aiActions.ts` | Add `'template_structured'` action that sends `{ description, parameters: [{name, value, unit}] }` as a JSON payload and expects a `Template` JSON back |
| `src/types/index.ts` | Add `ParameterRow` type: `{ name: string; value: string; unit: string }` and extend `AiAction` to include `'template_structured'` |

---

**New modal state shape:**

```ts
interface StructuredTmplModal {
  step: 'compose' | 'generating' | 'preview' | 'error';
  description: string;
  rows: ParameterRow[];           // the parameter table rows
  name: string;                   // template name
  shortcut: string;               // optional "/" keyword
  category: TemplateCategory;
  accent: TemplateAccent;
  generated: Template | null;     // AI output parsed into Template shape
  error: string;
}

interface ParameterRow {
  id: string;        // local key for React list rendering
  name: string;      // e.g. "Blood Pressure"
  value: string;     // optional example/hint value
  unit: string;      // e.g. "mmHg", "bpm", "AVF, AVG (select)"
}
```

---

**AI prompt outline** (for `aiActions.ts`):

```
You are a clinical template builder. Given a description and a parameter table,
produce a JSON object with this exact shape:

{
  "prose": [ { "heading": "...", "parts": [...] } ],
  "sections": [ { "title": "...", "fields": [...] } ]
}

Field type rules:
- mmHg → { "type": "bp" }
- bpm / % / whole numbers → { "type": "digits", "boxes": 3 }
- kg / L / decimal values → { "type": "decimal", "boxes": 3, "decimals": 1 }
- HH:MM → { "type": "time" }
- list of options (select) → { "type": "select", "options": [...] }
- list of options (multi) → { "type": "multiselect", "options": [...] }
- free text → { "type": "text", "placeholder": "..." }

Each field id in sections must match the field id referenced in prose parts.
Respond with raw JSON only — no markdown fences, no explanation.
```

---

**Done when:**
1. The "Add Template" button opens the new structured modal.
2. Doctor can add/remove parameter rows.
3. Clicking "Generate" sends the payload and shows a loading state.
4. On success, a template preview card renders using `ProseTemplateCard`.
5. Clicking "Save template" persists it and it appears in the `/` slash menu.
6. Error state shows a retry button.
7. All field types (`bp`, `digits`, `decimal`, `time`, `select`, `multiselect`, `text`) are correctly inferred from the unit column.

---

## Phase 2b · Restore Discoverability

### P2b-1 · Add a persistent formatting toolbar
- **File**: `src/components/DoctorInstructionsCard/DoctorNotePad.tsx`
- **Problem**: The only way to format text is the floating selection bubble — invisible until text is selected. New users will never discover it.
- **Fix**: Add a slim sticky toolbar above the editor (`np-toolbar` class) with: Bold, Italic, Underline, Strikethrough, Heading H2/H3, Bullet List, Divider, Highlight. Reuse the same `editor.chain().focus()` calls already in the selection bubble.
- **Done when**: A toolbar is visible above the editor at all times on desktop.

---

### P2b-2 · Move "Create template" out of the editor content area
- **File**: `src/components/DoctorInstructionsCard/DoctorNotePad.tsx:981-992`
- **Problem**: The "Create template" button is rendered inside `np-topbar` which sits inside the editor body, making it look like a content element rather than an action. The red outline reads as an error state.
- **Fix**: Move it into the persistent toolbar (P2-1) or into the `PageShell` topbar right side. Remove `np-topbar` entirely.
- **Done when**: "Create template" lives in the toolbar or topbar, not floating inside the editor canvas.

---

### P2b-3 · Fill the empty topbar right side
- **File**: `src/components/PageShell/PageShell.tsx:57`
- **Problem**: `cap-topbar__right` is a rendered but completely empty div.
- **Fix**: Add at minimum:
  - Save button (calls `Ctrl/Cmd+S` shortcut handler) with `⌘S` hint
  - Whole-note AI dropdown (Polish, Summarize) — these currently only work on selected text
  - Optional: breadcrumb (page name), user avatar placeholder
- **Done when**: Right side of top bar shows at least a Save button.

---

### P2b-4 · Fix modal and overlay z-index / viewport clipping
- **File**: `src/components/DoctorInstructionsCard/DoctorNotePad.tsx:1105-1288`
- **Problem**: The `MentionPopover`, template creator modal, error toasts, and the AI selection bubble are all rendered as children of `.doctor-notepad` → `.cap-page__body` → `.cap-content` (a scrollable overflow container). They can be clipped or mispositioned relative to the viewport.
- **Fix**: Render all floating layers (`mentionPopover`, `tmplModal` overlay, `aiError` toast, `selMenu` bubble) using `ReactDOM.createPortal(…, document.body)` so they escape the scroll container.
- **Done when**: Template modal and toasts appear correctly even when the editor is scrolled.

---

## Phase 3 · Build Out Stub Features

### P3-1 · Wire "New page" FAB
- **File**: `src/components/PageShell/PageShell.tsx:109`
- **Problem**: Button has no `onClick`. Clicking it does nothing.
- **Fix (minimal)**: Clear the editor content and reset the title to start a fresh note. Store the current note first (autosave fires).
- **Fix (full)**: Add a pages list in the sidebar; each page has its own `patientId`/key in localStorage. "New page" creates a new entry; clicking a page in the list loads it.
- **Done when**: Clicking "New page" at minimum clears the canvas and resets the title.

---

### P3-2 · Wire "Files" FAB and Files sidebar tab
- **File**: `src/components/PageShell/PageShell.tsx:106`
- **Problem**: Folder button has no `onClick`.
- **Fix**: Open the Files sidebar tab. Eventually show an attachment upload UI.
- **Done when**: Clicking the Files FAB switches the sidebar to the Files tab.

---

### P3-3 · Wire "Apps" button
- **File**: `src/components/PageShell/PageShell.tsx:43`
- **Problem**: Grid icon button has no `onClick`.
- **Fix**: Could open a command palette, an app-switcher, or simply be removed if there's no product need for it.
- **Done when**: Either wired or removed.

---

### P3-4 · Wire Section menu (⋯) button in sidebar
- **File**: `src/components/PageShell/PageShell.tsx:96`
- **Problem**: Dots button has no `onClick`.
- **Fix**: Show a small context menu with options like "Clear tasks", "Export", etc.
- **Done when**: Clicking ⋯ opens a small dropdown.

---

### P3-5 · Document and validate AI backend setup
- **File**: `src/components/DoctorInstructionsCard/aiActions.ts`
- **Problem**: AI actions call a backend API. If the env var / backend URL is missing, every AI action silently fails with a toast. There's no "AI not configured" notice.
- **Fix**: Check for the required env var at startup; if absent, disable AI buttons and show a tooltip "AI not configured — add VITE_AI_API_URL to .env".
- **Done when**: Missing env var shows a clear disabled state, not a runtime error toast.

---

## Backlog / Nice-to-have

- [ ] Keyboard shortcut cheat sheet (overlay or tooltip) — `⌘S`, `/`, `@` hints
- [ ] Onboarding empty state — first-time user sees a guided hint, not just placeholder text
- [ ] Outline tab: smooth-scroll to heading on click
- [ ] Search tab: highlight matches in the editor
- [ ] Export note as PDF / plain text
- [ ] Dark/light mode toggle
- [ ] Undo/redo buttons in toolbar
- [ ] Table of recently used templates in the `/` menu (already partially done for medicines)
