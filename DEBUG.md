# Jano Pad — Debug & Known Issues

## How to Run Locally

```bash
# 1. Clean install (do this first if you hit rollup errors)
rm -rf node_modules package-lock.json
npm install

# 2. Start dev server
npm run dev
# → http://localhost:5173

# 3. Type check (no build needed)
npm run typecheck
```

---

## Known Bugs

### BUG-01 · Page title resets on refresh
**Status**: Open  
**Severity**: High  
**Reproduces**: Type a title → refresh the page → title is gone, editor content restores fine.  
**Root cause**: Title state lives in `PageShell.tsx:34` as `useState('')`. It is never written to localStorage. The autosave in `DoctorNotePad.tsx:299–318` only saves the editor JSON, not the title.  
**Fix**: See `TASKS.md P1-1`.

---

### BUG-02 · Sidebar tabs are non-functional
**Status**: Open  
**Severity**: High  
**Reproduces**: Click Outline / Files / Search tabs → sidebar content never changes.  
**Root cause**: `activeTab` state is set in `PageShell.tsx:33` but the sidebar JSX always renders the same hardcoded "Tasks" block regardless of `activeTab`. There is no conditional render per tab.  
**Fix**: See `TASKS.md P1-3`.

---

### BUG-03 · Mobile layout: sidebar covers the entire screen
**Status**: Open  
**Severity**: Critical  
**Reproduces**: Open app on any screen narrower than ~500px → sidebar is 300px fixed width, no overflow hidden, editor is completely hidden behind it.  
**Root cause**: `pageshell.css` has no `@media` queries. The sidebar width is hardcoded to `300px` in both CSS and the inline style in `PageShell.tsx:66`.  
**Fix**: See `TASKS.md P1-2`.

---

### BUG-04 · "@rollup/rollup-darwin-arm64" module not found on fresh install
**Status**: Workaround documented  
**Severity**: High (blocks dev server startup)  
**Reproduces**: `npm install` then `npm run dev` on Apple Silicon (M1/M2/M3 Mac).  
**Root cause**: npm bug with optional peer dependencies — the ARM64 native rollup binary doesn't get installed when `package-lock.json` is present from a different architecture.  
**Fix**:
```bash
rm -rf node_modules package-lock.json
npm install
```
This is a known npm issue: https://github.com/npm/cli/issues/4828

---

### BUG-05 · Template creator modal may be clipped inside scroll container
**Status**: Open  
**Severity**: Medium  
**Reproduces**: Add enough content to make the editor scroll → open "Create template" → the modal overlay may not cover the full viewport.  
**Root cause**: The modal is rendered as a child of `.doctor-notepad` which is inside `.cap-content` (an `overflow-y: auto` scrollable div). The overlay `div.np-overlay` is `position: fixed` (check `ai-features.css`) but the modal itself may be positioned relative to a clipping ancestor.  
**Fix**: Use `ReactDOM.createPortal(modal, document.body)` for all floating layers. See `TASKS.md P2-4`.

---

### BUG-06 · AI selection bubble position may be wrong after scroll
**Status**: Open  
**Severity**: Medium  
**Reproduces**: Select text in the editor after scrolling down → the `np-sel-ai` bubble may appear offset from the actual selection.  
**Root cause**: `editor.view.coordsAtPos(head)` returns viewport-relative coordinates. The bubble uses these as `top` and `left` on a `position: fixed` element, which should be correct — but if any parent has a `transform` applied, fixed positioning breaks. Verify no parent of `.np-sel-ai` has a `transform`.  
**Debug steps**:
1. Open DevTools → select text in the editor after scrolling.
2. Inspect `.np-sel-ai` in the Elements panel.
3. Check if its `top`/`left` match the selection end position visually.
4. If not, look for a `transform` on any ancestor.

---

### BUG-07 · Slash menu does not open via `fill()` in automated tests
**Status**: Known limitation  
**Severity**: Low (test-only)  
**Reproduces**: Using `preview_fill` or programmatic `element.value = '/'` in the ProseMirror editor does not trigger the slash menu.  
**Root cause**: ProseMirror listens to DOM `input` events, not React synthetic events or direct value assignment. `fill()` bypasses keyboard event dispatch.  
**Workaround**: Use real keyboard event dispatch (`dispatchEvent(new KeyboardEvent('keypress', { key: '/' }))`) or Playwright's `page.keyboard.type('/')` for integration tests.

---

### BUG-08 · "Create template" shows error toast on empty editor
**Status**: Open (UX issue)  
**Severity**: Low  
**Reproduces**: Click "Create template" button with nothing typed in the editor → red toast appears: "Write or select some notes first to turn them into a template."  
**Root cause**: `openTemplateCreator()` in `DoctorNotePad.tsx:752` guards against empty `source` and calls `setAiError()`. Correct behaviour but confusing since the button is always visible.  
**Fix**: Disable the "Create template" button when `editor.isEmpty` is true, or show a tooltip explaining it needs content.

---

### BUG-09 · Stub buttons have no feedback (silent clicks)
**Status**: Open  
**Severity**: Medium  
**Affects**: Apps button (`PageShell.tsx:43`), Files FAB (`PageShell.tsx:106`), New Page FAB (`PageShell.tsx:109`), Section menu ⋯ (`PageShell.tsx:96`)  
**Reproduces**: Click any of these → nothing happens, no visual feedback.  
**Fix**: Wire them up (see `TASKS.md P3-1 to P3-4`) or at minimum add a disabled cursor and a tooltip.

---

### BUG-10 · AI backend not configured — no user-visible warning
**Status**: Open  
**Severity**: High (if AI is needed in prod)  
**Reproduces**: Deploy without `VITE_AI_API_URL` → click any AI action → red error toast appears with a raw error message.  
**Root cause**: `aiActions.ts` has no check for missing env var before attempting the fetch.  
**Fix**: At startup, if `import.meta.env.VITE_AI_API_URL` is falsy, set a flag and disable all AI buttons with a tooltip "AI not configured".

---

## Debugging Tips

### Editor content in the console
```js
// Paste in browser console to inspect current editor JSON
window.__editor?.getJSON()
window.__editor?.getText()
```
> `__editor` is not currently exposed — add `window.__editor = editor` inside `DoctorNotePad.tsx` `useEditor` callback temporarily for debugging.

### View saved draft
```js
// Paste in browser console
JSON.parse(localStorage.getItem('draft_note_pat001'))
```

### Clear all stored data (fresh start)
```js
// Paste in browser console
localStorage.removeItem('draft_note_pat001')
localStorage.removeItem('recent_medicines_pat001')
localStorage.removeItem('janopad_custom_templates')
```

### Force-reload custom templates
```js
// Custom templates are cached in module scope; hard refresh (Ctrl+Shift+R) clears it
```

---

## Sentry Setup

Sentry is initialised in `src/index.tsx`. The DSN is read from `VITE_SENTRY_DSN`.

To disable Sentry locally (prevents noisy dev errors being reported):
```env
# .env.local
VITE_SENTRY_DSN=
```

---

## Environment Variables Reference

Create a `.env` file at the project root (not committed — add to `.gitignore`):

```env
# Required for AI features (polish, expand, summarize, template creation)
VITE_AI_API_URL=https://your-backend.com/api/ai

# Required for error tracking in production
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

> `.env.example` does not currently exist in the repo. Create it as a template for new developers.

---

## Common Error Messages

| Error message | Cause | Fix |
|--------------|-------|-----|
| `Cannot find module @rollup/rollup-darwin-arm64` | Corrupted native dep install | Delete `node_modules` + `package-lock.json`, re-run `npm install` |
| `Write or select some notes first…` | Clicked "Create template" with empty editor | Add content before clicking |
| `The AI request failed. Please try again.` | AI backend unreachable or `VITE_AI_API_URL` not set | Set env var, check backend |
| `Draft restored` (green) | Expected — autosave from previous session was loaded | No action needed |
| Slash menu doesn't open | Typed `/` programmatically, not via real keyboard | Use real keyboard events in tests |
