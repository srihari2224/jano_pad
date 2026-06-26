# Jano Pad — Developer Instructions

## Project Overview

Jano Pad is a clinical rich-text notepad for doctors. It is built on:

| Layer | Tech |
|-------|------|
| Framework | React 18 + TypeScript |
| Bundler | Vite 5 |
| Editor | Tiptap 2 (ProseMirror-based) |
| Styling | Plain CSS (no Tailwind, no CSS-in-JS) |
| Error tracking | Sentry |
| Deployment | Vercel (`vercel.json`) |

---

## Getting Started

```bash
# Fresh install (required on first clone or after lockfile changes)
npm install

# Dev server — http://localhost:5173
npm run dev

# Type check only
npm run typecheck

# Production build
npm run build
```

> If you see `Cannot find module @rollup/rollup-darwin-arm64`, delete both
> `node_modules/` and `package-lock.json`, then re-run `npm install`.
> This is a known npm bug with optional native dependencies.

---

## Folder Structure

```
src/
├── App.tsx                          # Root: composes PageShell + DoctorInstructionsCard
├── index.tsx                        # React entry point + Sentry init
├── index.css                        # Global reset / base styles
├── types/index.ts                   # Shared TypeScript types (Draft, SlashItem, etc.)
│
├── components/
│   ├── PageShell/
│   │   ├── PageShell.tsx            # Layout shell: topbar, sidebar, content area
│   │   ├── pageshell.css            # Capacities-style dark workspace styles
│   │   ├── dark-page.css            # Dark-mode overrides
│   │   └── icons.tsx                # SVG icon components used by PageShell
│   │
│   └── DoctorInstructionsCard/
│       ├── index.tsx                # Thin wrapper: manages savedNote state, calls DoctorNotePad
│       ├── DoctorNotePad.tsx        # Main editor component (see below)
│       ├── MentionList.tsx          # @-mention suggestion dropdown UI
│       ├── MentionPopover.tsx       # Popover shown when clicking a @mention chip
│       ├── SlashCommandList.tsx     # / command dropdown UI
│       ├── aiActions.ts             # runAiAction() — calls the AI backend
│       ├── icons.tsx                # SVG icons for the editor
│       ├── utils.ts                 # formatIndianDate() and other small helpers
│       │
│       ├── editor/
│       │   ├── extensions/
│       │   │   ├── SlashCommands.ts        # Tiptap extension: "/" trigger
│       │   │   ├── AiLoading.ts            # Tiptap extension: shimmer while AI runs
│       │   │   ├── MentionChip.ts          # Tiptap extension: "@" mention chips
│       │   │   └── suggestionRender.tsx    # Shared suggestion popup renderer
│       │   └── nodes/
│       │       ├── MedicineNode.ts         # Custom inline node: medicine chip
│       │       ├── DiagnosisNode.ts        # Custom inline node: diagnosis chip
│       │       ├── LabTestNode.ts          # Custom inline node: lab test chip
│       │       ├── TemplateNode.ts         # Custom block node: template block
│       │       └── TemplateNodeView.tsx    # React NodeView for TemplateNode
│       │
│       ├── templates/
│       │   ├── ProseTemplateCard.tsx       # Renders a filled template block in the editor
│       │   └── templateSerializer.ts       # toText(): converts template + values → plain text
│       │
│       └── styles/
│           ├── notepad.css                 # Editor + notepad component styles
│           └── ai-features.css             # Selection bubble, toasts, modal styles
│
└── data/
    ├── db.json                      # Static clinical data (medicines, diagnoses, lab tests, mentions)
    ├── db.helpers.ts                # searchMedicineDoses(), searchDiagnoses(), etc.
    ├── templates.ts                 # Built-in note templates (getTemplateById, etc.)
    └── customTemplates.ts           # AI-generated custom templates (localStorage-backed)
```

---

## How the Editor Works

### Tiptap Setup (`DoctorNotePad.tsx`)

The editor is initialised with `useEditor()`. Key extensions:

| Extension | Purpose |
|-----------|---------|
| `StarterKit` | Paragraph, headings, bold, italic, strike, horizontal rule, bullet/ordered list |
| `Underline` | `Ctrl/Cmd+U` underline |
| `TextAlign` | Left/center/right align on paragraphs and headings |
| `Highlight` | Multicolor highlight |
| `Color` + `TextStyle` | Text colour |
| `Table` + Row/Header/Cell | Vitals table |
| `Placeholder` | Ghost text when editor is empty |
| `MedicineNode` | Inline chip: medicine + dose |
| `DiagnosisNode` | Inline chip: ICD diagnosis |
| `LabTestNode` | Inline chip: lab test |
| `TemplateNode` | Block node: fillable clinical template |
| `SlashCommands` | `/` suggestion menu (medicines, diagnoses, lab tests, templates, quick actions) |
| `MentionChip` | `@` suggestion menu (patients, doctors) |
| `AiLoading` | Shimmer decoration while an AI action is running |
| `SaveShortcut` | `Ctrl/Cmd+S` fires `handleSave()` |

### The `/` Slash Menu

Typing `/` opens a unified search menu. `buildSlashItems(rawQuery)` in `DoctorNotePad.tsx` handles:

- Empty query → show templates + recently-used medicines + quick actions
- Typed query → search all clinical types simultaneously
- Prefix keywords narrow the search: `med`, `rx`, `dx`, `lab`, `tmpl`

Examples:
```
/               → templates + recent meds + quick actions
/amoxicillin    → medicines matching "amoxicillin"
/dx ckd         → diagnoses matching "ckd"
/vitals         → inserts the vitals table directly
/date           → inserts today's date (Indian format)
```

### Autosave

- Every `onUpdate` event schedules a 2-second debounced write to `localStorage`.
- Key: `draft_note_<patientId>` (e.g. `draft_note_pat001`)
- Format: `{ version: 3, editor: <TipTapJSON> }`
- On mount, the saved draft is read and `editor.commands.setContent()` is called.
- Versions 2 and 3 are handled with migration logic (see `DoctorNotePad.tsx:864–908`).

### AI Actions

All AI actions go through `runAiAction(text, actionId)` in `aiActions.ts`.

Actions:
| ID | Mode | What it does |
|----|------|-------------|
| `polish` | replace | Corrects spelling/grammar in the selection |
| `expand` | replace | Expands shorthand into full clinical prose |
| `summarize` | append | Adds a "Summary" heading after the selection |
| `explain` | append | Adds a "Medical Terms" heading after the selection |
| `template` | return | Converts notes into a reusable template with `{{variables}}` |

The backend URL must be set in `.env`:
```
VITE_AI_API_URL=https://your-backend.com/api/ai
```

Without this, all AI actions throw an error and show a red toast.

### Custom Templates

- `addCustomTemplate(tpl)` in `customTemplates.ts` saves to `localStorage` key `janopad_custom_templates`.
- `subscribeCustomTemplates(cb)` fires `cb` whenever templates change so `DoctorNotePad` can re-render the `/` menu.
- Custom templates appear in the `/` menu alongside built-in templates.

---

## Persistence Map

| Data | Key | Format |
|------|-----|--------|
| Editor draft | `draft_note_<patientId>` | `{ version: 3, editor: TipTapJSON }` |
| Recent medicines | `recent_medicines_<patientId>` | `MedicineDoseRow[]` (max 6) |
| Custom templates | `janopad_custom_templates` | `Template[]` |

> Page title is NOT currently persisted — see `TASKS.md P1-1`.

---

## Adding a New Slash Command

1. Define the item shape in `buildSlashItems()` in `DoctorNotePad.tsx`.
2. Give it a unique `id`, a `kind`, a `group`, an `iconKey`, and an `onSelect({ editor, range })` callback.
3. The `iconKey` maps to an icon in `SlashCommandList.tsx` — add a new case there if needed.

## Adding a New Custom Node

1. Create `src/components/DoctorInstructionsCard/editor/nodes/YourNode.ts`.
2. Extend `Node` from `@tiptap/core`. Define `name`, `group` (`inline` or `block`), `atom: true` for chips, `attrs`, `parseHTML`, `renderHTML`, and optionally `renderText`.
3. Import and add the node to the `extensions` array in `DoctorNotePad.tsx`.

## Adding a New Sidebar Tab

1. Add `{ id: 'mytab', label: 'My Tab', Icon: IcoSomething }` to the `SIDE_TABS` array in `PageShell.tsx`.
2. Add a new `else if (activeTab === 'mytab')` block inside the sidebar JSX to render the tab's content.
3. Add the corresponding icon to `PageShell/icons.tsx`.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_AI_API_URL` | For AI features | Base URL of the AI backend |
| `VITE_SENTRY_DSN` | For error tracking | Sentry DSN (set in Sentry dashboard) |

Copy `.env.example` to `.env` and fill in the values (file not yet created — see `DEBUG.md`).

---

## Deployment

- Push to `main` → Vercel auto-deploys via `vercel.json`.
- The `api/` folder at the root contains any Vercel serverless functions (if present).
- Vite build output: `dist/`.

---

## Keyboard Shortcuts (Editor)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save draft |
| `/` | Open slash command menu |
| `@` | Open mention menu |
| `Ctrl/Cmd + B` | Bold |
| `Ctrl/Cmd + I` | Italic |
| `Ctrl/Cmd + U` | Underline |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |
| `Enter` (in slash menu) | Insert selected item |
| `Escape` | Close slash/mention menu |
