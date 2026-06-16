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

import type {
  Template,
  ProseBlock,
  ProsePart,
  ProseFieldPart,
  ProseFieldKind,
  Field,
  FieldType,
  ParameterRow,
  TemplateAccent,
  TemplateCategory,
} from '../types';

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

/* ──────────────── structured builder (P2-0) ─────────────────────────── */

/** Unique, stable field id from a parameter name. */
function fieldId(name: string, idx: number): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `f_${slug || 'field'}_${idx}`;
}

const DECIMAL_UNITS = ['kg', 'l', '°f', 'of', 'cm', 'ml', 'l/day'];
const DIGIT_UNITS = ['bpm', '%', 'mg/dl', 'mmol/l', 'min', 'ml/min', 'mmhg'];

/** Split a "AVF, AVG / Tunnelled catheter (select)" style cell into options. */
function parseOptions(raw: string): string[] {
  return raw
    .replace(/\((?:select|multi)\)/gi, '')
    .split(/[,/]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Infer a structured Field (+ matching prose fragment kind) from one parameter
 * row, following the unit/value heuristics documented in TASKS.md P2-0.
 */
function inferField(
  row: ParameterRow,
  idx: number,
): { field: Field; kind: ProseFieldKind; vital?: 'bp' | 'pulse' | 'spo2'; options?: string[]; ph?: string } {
  const id = fieldId(row.name, idx);
  const label = row.name.trim() || `Field ${idx + 1}`;
  const unit = row.unit.trim();
  const value = row.value.trim();
  const hint = `${unit} ${value}`.toLowerCase();
  const u = unit.toLowerCase();

  const isMulti = /\(multi\)/i.test(hint);
  const isSelect = isMulti || /\(select\)/i.test(hint);

  // select / multiselect — options taken from whichever cell lists them.
  if (isSelect) {
    const src = /[,/]/.test(value) ? value : unit;
    const options = parseOptions(src);
    return {
      field: { id, label, type: isMulti ? 'multiselect' : 'select', options },
      kind: isMulti ? 'multi' : 'pick',
      options,
    };
  }

  // blood pressure
  if (u.includes('mmhg') || /^\d{2,3}\/\d{2,3}$/.test(value)) {
    return {
      field: { id, label, type: 'bp', unit: 'mmHg' },
      kind: 'num',
      vital: 'bp',
      ph: '—/—',
    };
  }

  // time
  if (/^(hh:mm|time)$/.test(u) || /^\d{1,2}:\d{2}$/.test(value)) {
    return { field: { id, label, type: 'time' }, kind: 'num', ph: '00:00' };
  }

  // decimal readings
  if (DECIMAL_UNITS.includes(u)) {
    return {
      field: { id, label, type: 'decimal', boxes: 3, decimals: 1, unit },
      kind: 'num',
      ph: '—',
    };
  }

  // whole-number readings
  if (DIGIT_UNITS.includes(u)) {
    const field: Field = { id, label, type: 'digits', boxes: 3, unit };
    if (u === '%') field.max = 100;
    return { field, kind: 'num', vital: u === '%' ? 'spo2' : undefined, ph: '—' };
  }

  // no unit / free text
  return {
    field: { id, label, type: 'text', placeholder: label },
    kind: 'long',
    ph: label,
  };
}

const VALID_FIELD_TYPES: FieldType[] = [
  'bp',
  'decimal',
  'digits',
  'time',
  'select',
  'multiselect',
  'text',
];
const KIND_FOR_TYPE: Record<string, ProseFieldKind> = {
  bp: 'num',
  digits: 'num',
  decimal: 'num',
  time: 'num',
  select: 'pick',
  multiselect: 'multi',
  text: 'long',
};

/**
 * Assemble a Template from the raw JSON the AI returns for `template_structured`.
 * Validates the shape and normalises field ids/kinds; throws if the output is
 * unusable so callers can fall back to the deterministic builder.
 */
export function assembleTemplateFromAi(
  raw: string,
  meta: {
    name?: string;
    shortcut?: string;
    accent?: TemplateAccent;
    category?: TemplateCategory;
  } = {},
): Template {
  const {
    name = 'Untitled Template',
    shortcut = '',
    accent = 'blue',
    category = 'assessment',
  } = meta;

  const cleaned = String(raw || '')
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned); // throws on non-JSON → caller falls back
  const rawSections = Array.isArray(parsed.sections) ? parsed.sections : [];
  const rawProse = Array.isArray(parsed.prose) ? parsed.prose : [];

  // Normalise fields and track which ids are valid.
  const fieldTypeById = new Map<string, FieldType>();
  const sections: { title: string; fields: Field[] }[] = rawSections.map(
    (s: any) => ({
      title: String(s?.title || name),
      fields: (Array.isArray(s?.fields) ? s.fields : [])
        .filter((f: any) => f && f.id)
        .map((f: any): Field => {
          const type: FieldType = VALID_FIELD_TYPES.includes(f.type)
            ? f.type
            : 'text';
          fieldTypeById.set(String(f.id), type);
          const field: Field = {
            id: String(f.id),
            label: String(f.label || f.id),
            type,
          };
          if (f.unit) field.unit = String(f.unit);
          if (typeof f.boxes === 'number') field.boxes = f.boxes;
          if (typeof f.decimals === 'number') field.decimals = f.decimals;
          if (typeof f.max === 'number') field.max = f.max;
          if (Array.isArray(f.options)) field.options = f.options.map(String);
          return field;
        }),
    }),
  );

  const allFields = sections.flatMap((s) => s.fields);
  if (!allFields.length) throw new Error('AI template had no fields');

  const optionsById = new Map<string, string[]>();
  allFields.forEach((f) => {
    if (f.options) optionsById.set(f.id, f.options);
  });

  // Normalise prose; keep only field parts that reference a real field id.
  const prose: ProseBlock[] = rawProse
    .map((b: any): ProseBlock => {
      const parts: ProsePart[] = (Array.isArray(b?.parts) ? b.parts : [])
        .map((p: any): ProsePart | null => {
          if (p && typeof p.t === 'string') return { t: p.t };
          if (p && p.f && fieldTypeById.has(String(p.f))) {
            const id = String(p.f);
            const kind: ProseFieldKind =
              p.kind && ['num', 'long', 'pick', 'multi'].includes(p.kind)
                ? p.kind
                : KIND_FOR_TYPE[fieldTypeById.get(id)!] || 'long';
            const part: ProseFieldPart = { f: id, kind };
            if (p.ph) part.ph = String(p.ph);
            if (p.vital && ['bp', 'pulse', 'spo2'].includes(p.vital)) {
              part.vital = p.vital;
            }
            const opts = optionsById.get(id);
            if ((kind === 'pick' || kind === 'multi') && opts) {
              part.options = opts;
            }
            return part;
          }
          return null;
        })
        .filter(Boolean) as ProsePart[];
      const block: ProseBlock = { parts };
      if (b?.heading) block.heading = String(b.heading);
      return block;
    })
    .filter((b: ProseBlock) => b.heading || b.parts.length);

  if (!prose.length) throw new Error('AI template had no prose');

  const rnd = Math.floor(Math.random() * 1e6).toString(36);
  const id = `tmpl_custom_${Date.now().toString(36)}_${rnd}`;

  return {
    id,
    title: name,
    category,
    accent,
    shortcut: slugifyShortcut(shortcut),
    custom: true,
    flat: true,
    prose,
    sections,
  };
}

/**
 * Build a renderable Template from a free-text description and a parameter
 * table. Field types are inferred per the unit column; the result is shaped
 * exactly like the built-in templates so ProseTemplateCard renders it with
 * fillable inline fields.
 */
export function buildTemplateFromStructured(
  description: string,
  rows: ParameterRow[],
  meta: {
    name?: string;
    shortcut?: string;
    accent?: TemplateAccent;
    category?: TemplateCategory;
  } = {},
): Template {
  const {
    name = 'Untitled Template',
    shortcut = '',
    accent = 'blue',
    category = 'assessment',
  } = meta;

  const usable = rows.filter((r) => r.name.trim());
  const fields: Field[] = [];
  const prose: ProseBlock[] = [];

  const desc = description.trim();
  if (desc) prose.push({ heading: name, parts: [{ t: desc }] });

  usable.forEach((row, idx) => {
    const inferred = inferField(row, idx);
    fields.push(inferred.field);
    const fieldPart: ProsePart = {
      f: inferred.field.id,
      kind: inferred.kind,
      ...(inferred.ph ? { ph: inferred.ph } : {}),
      ...(inferred.vital ? { vital: inferred.vital } : {}),
      ...(inferred.options ? { options: inferred.options } : {}),
    };
    const unitSuffix = inferred.field.unit ? ` ${inferred.field.unit}` : '';
    prose.push({
      parts: [
        { t: `${inferred.field.label}: ` },
        fieldPart,
        { t: `${unitSuffix}.` },
      ],
    });
  });

  if (!prose.length) prose.push({ parts: [{ t: desc || name }] });

  const sections = [{ title: name, fields }];

  const rnd = Math.floor(Math.random() * 1e6).toString(36);
  const id = `tmpl_custom_${Date.now().toString(36)}_${rnd}`;

  return {
    id,
    title: name,
    category,
    accent,
    shortcut: slugifyShortcut(shortcut),
    custom: true,
    flat: true,
    prose,
    sections,
  };
}
