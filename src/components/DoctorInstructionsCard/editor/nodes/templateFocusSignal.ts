/**
 * A tiny cross-module signal so a freshly INSERTED template auto-focuses its
 * first field, while templates rehydrated on page load do not.
 *
 * applyTemplate calls `markTemplateInserted()` right before inserting; the
 * about-to-mount TemplateNodeView calls `consumeTemplateInsert()` in a layout
 * effect and focuses its first field if the insert was just now. Using a plain
 * module variable (not a timer) keeps it reliable and synchronous.
 */
let lastInsertAt = 0;

export function markTemplateInserted(): void {
  lastInsertAt = Date.now();
}

/**
 * True if a template was inserted in the last ~1.5s. Deliberately does NOT
 * clear the flag: StrictMode runs layout effects twice in dev, and clearing on
 * the first run would make the second run (and the real focus) a no-op. The
 * short time window self-expires, and on reload the module resets to 0 — so
 * rehydrated templates never match.
 */
export function consumeTemplateInsert(): boolean {
  return lastInsertAt > 0 && Date.now() - lastInsertAt < 1500;
}
