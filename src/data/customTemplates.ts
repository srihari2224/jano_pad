/**
 * customTemplates.js
 * -------------------------------------------------------------------------
 * A small localStorage-backed store for AI-generated, doctor-authored
 * templates. These live alongside the built-in TEMPLATES (see templates.js,
 * which merges both) so they show up in the "/" menu, resolve by id when a
 * templateBlock renders, and persist across reloads.
 *
 * `buildTemplateFromText` turns AI output of the form
 *   "BP is {{BP}}. Patient reports {{SYMPTOM}} for {{DURATION}}."
 * into a template object shaped exactly like the built-in ones, so the same
 * ProseTemplateCard renders it with fillable inline fields.
 * -------------------------------------------------------------------------
 */

import type { Template, ProseBlock, ProsePart } from '../types';

const KEY = 'jano.customTemplates.v1';
const listeners = new Set<() => void>();

function read(): Template[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(arr: Template[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch {
    /* quota / private mode — non-fatal */
  }
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore listener errors */
    }
  });
}

/** Every saved custom template (raw template objects). */
export function getCustomTemplates(): Template[] {
  return read();
}

/** Subscribe to add/remove changes. Returns an unsubscribe fn. */
export function subscribeCustomTemplates(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getCustomTemplateById(id: string): Template | null {
  return read().find((t) => t.id === id) || null;
}

export function deleteCustomTemplate(id: string): void {
  write(read().filter((t) => t.id !== id));
}

/** Add (or replace by id) a custom template and persist. */
export function addCustomTemplate(tpl: Template): Template {
  const next = [...read().filter((t) => t.id !== tpl.id), tpl];
  write(next);
  return tpl;
}

/* ───────────────────────── builder ──────────────────────────────────── */

// Variable names that read as numbers — rendered as compact numeric blanks.
const NUMERIC_HINT =
  /\b(BP|PRESSURE|PULSE|HEART|HR|RR|SPO2|SAT|SATURATION|TEMP|TEMPERATURE|WEIGHT|HEIGHT|BMI|DOSE|DOSAGE|VALUE|COUNT|AGE|RATE|LEVEL|VOLUME|UF|DURATION|NUMBER|QTY|QUANTITY|GRBS|HB|CREAT|UREA|NA|K)\b/;

function humanize(name: string): string {
  return name
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Normalise a user-typed shortcut to a clean "/" trigger keyword. */
export function slugifyShortcut(s: string): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);
}

// A line is a heading when it has no placeholders and looks like a label.
function isHeadingLine(line: string): boolean {
  const t = line.trim();
  if (!t || t.includes('{{')) return false;
  if (/^#{1,6}\s+/.test(t)) return true;
  // "Vitals on arrival", "EVENT", "Prescription:" — short, title/caps, no end punctuation
  if (t.length > 42) return false;
  if (/[.!?]$/.test(t)) return false;
  return /^[A-Z][A-Za-z0-9 /()\-,&]*:?$/.test(t);
}

/**
 * Build a renderable template object from AI placeholder text.
 * @param {string} rawText  e.g. "BP is {{BP}}. Reports {{SYMPTOM}}."
 * @param {{name?:string, shortcut?:string, accent?:string, category?:string}} meta
 */
export function buildTemplateFromText(
  rawText: string,
  meta: { name?: string; shortcut?: string; accent?: string; category?: string } = {},
): Template {
  const {
    name = 'Untitled Template',
    shortcut = '',
    accent = 'violet',
    category = 'custom',
  } = meta;

  const text = String(rawText || '')
    .replace(/\r\n/g, '\n')
    // strip accidental ``` fences the model sometimes adds
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();

  const lines = text.split('\n');
  const prose: ProseBlock[] = [];
  const fieldMap = new Map<string, string>(); // VAR_NAME -> field id
  const fields: Array<{ id: string; label: string; ph: string; numeric: boolean }> = [];

  const varRe = /\{\{\s*([A-Za-z0-9_ ]+?)\s*\}\}/g;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line.trim()) continue; // blank line → block separator, skip
    // skip Markdown setext underlines / horizontal rules (===, ---, ___)
    if (/^[=\-_]{3,}$/.test(line.trim())) continue;

    if (isHeadingLine(line)) {
      prose.push({
        heading: line.replace(/^#{1,6}\s+/, '').replace(/:$/, ''),
        parts: [],
      });
      continue;
    }

    const parts: ProsePart[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    varRe.lastIndex = 0;
    while ((m = varRe.exec(line))) {
      if (m.index > last) parts.push({ t: line.slice(last, m.index) });
      const varName = m[1].trim().replace(/\s+/g, '_').toUpperCase();
      let fieldId = fieldMap.get(varName);
      if (!fieldId) {
        fieldId = `f_${varName.toLowerCase()}_${fields.length}`;
        fieldMap.set(varName, fieldId);
        fields.push({
          id: fieldId,
          label: humanize(varName),
          ph: humanize(varName),
          numeric: NUMERIC_HINT.test(varName),
        });
      }
      const fdef = fields.find((f) => f.id === fieldId)!;
      parts.push({
        f: fieldId,
        kind: fdef.numeric ? 'num' : 'long',
        ph: fdef.ph,
      });
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push({ t: line.slice(last) });

    // If the previous block is a bare heading, attach this line to it.
    const prev = prose[prose.length - 1];
    if (prev && prev.heading && prev.parts.length === 0) {
      prev.parts = parts;
    } else {
      prose.push({ parts });
    }
  }

  if (!prose.length) prose.push({ parts: [{ t: text }] });

  const sections = [
    {
      title: name,
      fields: fields.map((f) => ({ id: f.id, label: f.label, type: 'text' as const })),
    },
  ];

  const rnd = Math.floor(Math.random() * 1e6).toString(36);
  const id = `tmpl_custom_${Date.now().toString(36)}_${rnd}`;

  return {
    id,
    title: name,
    category,
    accent,
    shortcut: slugifyShortcut(shortcut),
    custom: true,
    flat: true, // serializer hint → render as flowing prose, not a field list
    prose,
    sections,
  };
}
