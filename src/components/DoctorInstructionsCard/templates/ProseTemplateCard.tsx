import { Fragment, useEffect, useRef, useState } from 'react';
import type React from 'react';
import type {
  ProseBlock,
  ProseFieldPart,
  ProsePart,
  Template,
  TemplateValues,
  VitalKind,
  PickVariant,
} from '../../../types';

/** Forward/backward field navigation across the editable fragments. */
interface Nav {
  advance: (el: HTMLElement | null) => void;
  retreat: (el: HTMLElement | null) => void;
}

/* pick-token colour by variant + value */
const PICK_CLASS: Record<string, (v: string) => string> = {
  type: () => 'tp-pick--teal',
  sev: (v) =>
    ({ Mild: 'tp-pick--amber', Moderate: 'tp-pick--crimson', Severe: 'tp-pick--red' }[v] ||
      'tp-pick--teal'),
  out: (v) =>
    ({
      Resolved: 'tp-pick--green',
      Resolving: 'tp-pick--teal',
      Ongoing: 'tp-pick--amber',
      Escalated: 'tp-pick--red',
      Yes: 'tp-pick--green',
      No: 'tp-pick--red',
      Partial: 'tp-pick--amber',
    }[v] || 'tp-pick--teal'),
};

const TAG_ICON: Record<string, string> = {
  complication: '⚠',
  assessment: '✦',
  summary: '✦',
  medication: '✚',
};

/** Small aligned chevron for pick tokens — crisper and more consistent than a
 *  unicode glyph. Inherits the token's text colour via currentColor. */
function Chevron() {
  return (
    <svg
      className="tp-chev"
      width="9"
      height="9"
      viewBox="0 0 12 12"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2.75 4.5 6 7.75 9.25 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M11.3 2.3a1.5 1.5 0 0 1 2.1 0l.3.3a1.5 1.5 0 0 1 0 2.1L5.3 13.1l-2.9.6.6-2.9 8.3-8.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
      <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 7v4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="4.7" r="0.9" fill="currentColor" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path
        d="M2.5 7.3 5.6 10.5 11.5 3.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Screw / hex-bolt — a mechanical settings glyph, distinct from the
 *  lightning bolt this used to be. Hex head with a slotted cross indent. */
function BoltIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path
        d="M7 1.5 12 4v6L7 12.5 2 10V4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M7 5v4M5 7h4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Deep-clone a prose block array before mutating — never edit template
 *  props in place. */
function cloneProse(prose: ProseBlock[]): ProseBlock[] {
  return JSON.parse(JSON.stringify(prose));
}

function slugify(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field';
}

function uniqueFieldId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}_${i}`)) i += 1;
  return `${base}_${i}`;
}

/** Text fragment (heading or static prose) editable in place. Content is set
 *  once on mount, same pattern as `Blank`, to avoid cursor jumps on re-render. */
interface EditableTextProps {
  value: string;
  className?: string;
  placeholder?: string;
  onCommit: (v: string) => void;
  onFocus?: () => void;
}
function EditableText({ value, className, placeholder, onCommit, onFocus }: EditableTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.textContent = value || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <span
      ref={ref}
      className={`tp-editable-text${className ? ` ${className}` : ''}`}
      data-placeholder={placeholder || ''}
      contentEditable
      suppressContentEditableWarning
      onFocus={onFocus}
      onBlur={(e) => onCommit(e.currentTarget.textContent ?? '')}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
      }}
    />
  );
}

/** Body text run that reports typing pauses back up so the parent can float
 *  a "+" pill under the caret. `onTypingResume` fires on every input so any
 *  stale pill can be dismissed the moment the doctor starts typing again. */
interface IdleAwareProps {
  value: string;
  placeholder?: string;
  onCommit: (v: string) => void;
  onIdle: (span: HTMLSpanElement) => void;
  onTypingResume: () => void;
}
function IdleAwareEditableText({ value, placeholder, onCommit, onIdle, onTypingResume }: IdleAwareProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.textContent = value || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <span
      ref={ref}
      className="tp-editable-text tp-editable-body"
      data-placeholder={placeholder || ''}
      contentEditable
      suppressContentEditableWarning
      onInput={() => {
        onTypingResume();
        if (ref.current) onIdle(ref.current);
      }}
      onBlur={(e) => onCommit(e.currentTarget.textContent ?? '')}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
      }}
    />
  );
}

/** Wraps a field control with a hover-revealed × when the card is editing;
 *  passes through untouched otherwise so fill-mode visuals stay unchanged. */
function EditableFieldChip({
  editing,
  onRemove,
  children,
}: {
  editing: boolean;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  if (!editing) return <>{children}</>;
  return (
    <span className="tp-field-chip">
      {children}
      <button
        type="button"
        className="tp-field-x"
        aria-label="Remove field"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        <XIcon />
      </button>
    </span>
  );
}

/** An editable text run with a faint "+" that appears right after it while
 *  typing/hovering — clicking it inserts a new field at that exact spot,
 *  instead of a single toolbar button working off a "last focused" guess. */
function TextWithPlus({
  value,
  placeholder,
  onCommit,
  onAddField,
}: {
  value: string;
  placeholder?: string;
  onCommit: (v: string) => void;
  onAddField: () => void;
}) {
  return (
    <span className="tp-text-plus-wrap">
      <EditableText value={value} placeholder={placeholder} onCommit={onCommit} />
      <button
        type="button"
        className="tp-inline-plus"
        aria-label="Add field here"
        tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onAddField}
      >
        <PlusIcon />
      </button>
    </span>
  );
}

interface FieldSettingsDraft {
  label: string;
  unit: string;
  min: string;
  max: string;
}

/** "Bolt" settings popover for a plain numeric field — parameter name, unit,
 *  and a min/max range that drives the green/red in-range indicator. */
function FieldBoltPopover({
  initial,
  onSave,
  onClose,
}: {
  initial: FieldSettingsDraft;
  onSave: (draft: FieldSettingsDraft) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const set = (patch: Partial<FieldSettingsDraft>) => setDraft((d) => ({ ...d, ...patch }));
  return (
    <span className="tp-bolt-popover" onMouseDown={(e) => e.stopPropagation()}>
      <label className="tp-bolt-row">
        <span>Name</span>
        <input value={draft.label} onChange={(e) => set({ label: e.target.value })} />
      </label>
      <label className="tp-bolt-row">
        <span>Unit</span>
        <input value={draft.unit} onChange={(e) => set({ unit: e.target.value })} />
      </label>
      <label className="tp-bolt-row">
        <span>Min</span>
        <input value={draft.min} inputMode="decimal" onChange={(e) => set({ min: e.target.value })} />
      </label>
      <label className="tp-bolt-row">
        <span>Max</span>
        <input value={draft.max} inputMode="decimal" onChange={(e) => set({ max: e.target.value })} />
      </label>
      <span className="tp-bolt-actions">
        <button type="button" className="tp-bolt-cancel" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="tp-bolt-save" onClick={() => onSave(draft)}>
          Save
        </button>
      </span>
    </span>
  );
}

/** Compact dashboard popover triggered by the (i) icon beside the title —
 *  a single place to see the template's name, shortcut, and every variable
 *  on one line each (name / unit / min / max). Purely presentational: it
 *  calls the same commit paths the inline editors already use. */
function InfoPopover({
  title,
  shortcut,
  fields,
  onTitleChange,
  onShortcutChange,
  onFieldChange,
  onFieldRemove,
  onClose,
}: {
  title: string;
  shortcut: string;
  fields: Array<{ blockIndex: number; partIndex: number; part: ProseFieldPart }>;
  onTitleChange: (v: string) => void;
  onShortcutChange: (v: string) => void;
  onFieldChange: (blockIndex: number, partIndex: number, draft: FieldSettingsDraft) => void;
  onFieldRemove: (blockIndex: number, partIndex: number) => void;
  onClose: () => void;
}) {
  return (
    <span
      className="tp-info-popover"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="tp-info-head">
        <span className="tp-info-title">Template details</span>
        <button
          type="button"
          className="tp-info-close"
          aria-label="Close details"
          onClick={onClose}
        >
          <XIcon />
        </button>
      </span>

      <label className="tp-bolt-row">
        <span>Name</span>
        <input defaultValue={title} onBlur={(e) => onTitleChange(e.target.value)} />
      </label>
      <label className="tp-bolt-row">
        <span>Shortcut</span>
        <input
          defaultValue={shortcut}
          onBlur={(e) => onShortcutChange(e.target.value.replace(/^\/+/, ''))}
        />
      </label>

      <span className="tp-info-sep">Variables ({fields.length})</span>
      {fields.length === 0 && (
        <span className="tp-info-empty">
          No variables yet — use the inline “+” in the note to add one.
        </span>
      )}
      {fields.map(({ blockIndex, partIndex, part }) => {
        const key = `${blockIndex}:${partIndex}`;
        const commit = (patch: Partial<FieldSettingsDraft>) => {
          const current: FieldSettingsDraft = {
            label: part.ph || '',
            unit: part.unit || '',
            min: part.min != null ? String(part.min) : '',
            max: part.max != null ? String(part.max) : '',
          };
          onFieldChange(blockIndex, partIndex, { ...current, ...patch });
        };
        return (
          <span key={key} className="tp-info-field">
            <input
              className="tp-info-field-name"
              defaultValue={part.ph || ''}
              placeholder="name"
              onBlur={(e) => commit({ label: e.target.value })}
            />
            <input
              className="tp-info-field-unit"
              defaultValue={part.unit || ''}
              placeholder="unit"
              onBlur={(e) => commit({ unit: e.target.value })}
            />
            <input
              className="tp-info-field-num"
              inputMode="decimal"
              defaultValue={part.min != null ? String(part.min) : ''}
              placeholder="min"
              onBlur={(e) => commit({ min: e.target.value })}
            />
            <input
              className="tp-info-field-num"
              inputMode="decimal"
              defaultValue={part.max != null ? String(part.max) : ''}
              placeholder="max"
              onBlur={(e) => commit({ max: e.target.value })}
            />
            <button
              type="button"
              className="tp-info-field-x"
              aria-label="Remove variable"
              onClick={() => onFieldRemove(blockIndex, partIndex)}
            >
              <XIcon />
            </button>
          </span>
        );
      })}
    </span>
  );
}

/** Inline "name this field" input shown at the insertion point after +Field. */
function FieldNamingInput({
  value,
  onChange,
  onCommit,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <span className="tp-field-naming">
      <input
        autoFocus
        value={value}
        placeholder="field name"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onCommit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
        onBlur={onCommit}
      />
    </span>
  );
}

const onlyNum = (s: unknown) => parseInt(String(s || '').replace(/[^0-9]/g, ''), 10);

/** low / high flag for a known vital, or null */
function vitalFlag(vital: VitalKind | undefined, raw: unknown): 'low' | 'high' | null {
  if (vital === 'bp') {
    const [s, d] = String(raw || '').split('/').map(onlyNum);
    if ((s && s < 90) || (d && d < 60)) return 'low';
    if (s > 180 || d > 110) return 'high';
  } else if (vital === 'pulse') {
    const p = onlyNum(raw);
    if (p && p < 50) return 'low';
    if (p > 100) return 'high';
  } else if (vital === 'spo2') {
    const s = onlyNum(raw);
    if (s && s < 94) return 'low';
  }
  return null;
}

/** Generic low/high/ok flag for any field with a doctor-configured min/max
 *  (set via the field's bolt settings), independent of the hardcoded
 *  vitals above. `ok` means a value is present and within range. */
function rangeFlag(
  min: number | undefined,
  max: number | undefined,
  raw: unknown,
): 'low' | 'high' | 'ok' | null {
  if (min == null && max == null) return null;
  const n = parseFloat(String(raw ?? ''));
  if (!Number.isFinite(n)) return null;
  if (min != null && n < min) return 'low';
  if (max != null && n > max) return 'high';
  return 'ok';
}

function placeCaretEnd(el: HTMLElement | null) {
  if (!el || !el.isContentEditable) return;
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(false);
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(r);
}

interface BlankProps {
  value: string;
  placeholder?: string;
  long?: boolean;
  flagged?: boolean;
  onChange: (v: string) => void;
  nav: Nav;
}

/** Editable inline fragment. Content is set once on mount to avoid cursor jumps. */
function Blank({ value, placeholder, long, flagged, onChange, nav }: BlankProps) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.textContent = value || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      nav.advance(ref.current);
    } else if (e.key === 'Enter' && e.shiftKey) {
      // allow a manual line break in long fields
      e.preventDefault();
      document.execCommand('insertLineBreak');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.shiftKey ? nav.retreat(ref.current) : nav.advance(ref.current);
    }
  };

  return (
    <span
      ref={ref}
      className={`tp-blank${long ? ' tp-blank--long' : ''}${flagged ? ' tp-blank--bad' : ''}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-ph={placeholder}
      onInput={(e) => onChange(e.currentTarget.textContent ?? '')}
      onKeyDown={onKeyDown}
    />
  );
}

/** Single-choice coloured token + dropdown.
 *  Keyboard flow:  ↑/↓ moves the highlight, Enter picks + advances to the
 *  next field, Esc closes without picking, Tab/Shift+Tab closes and moves on.
 *
 *  The keydown listener is attached natively (NOT via React onKeyDown) and
 *  calls stopPropagation, so the arrow keys never reach ProseMirror's
 *  cursor-navigation handler that lives on the surrounding .ProseMirror. */
interface PickProps {
  value: string;
  options: string[];
  variant?: PickVariant;
  onChange: (v: string) => void;
  nav: Nav;
}

function Pick({ value, options, variant, onChange, nav }: PickProps) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLSpanElement>(null);
  const current = value || options[0];

  // Stable refs so the once-attached native listener always sees fresh state.
  const stateRef = useRef<{ open: boolean; hi: number }>({ open, hi });
  stateRef.current = { open, hi };
  const cbRef = useRef<{
    choose: (o: string) => void;
    advance: () => void;
    retreat: () => void;
  }>({} as { choose: (o: string) => void; advance: () => void; retreat: () => void });
  cbRef.current = {
    choose: (o) => {
      onChange(o);
      setOpen(false);
      nav.advance(btnRef.current);
    },
    advance: () => nav.advance(btnRef.current),
    retreat: () => nav.retreat(btnRef.current),
  };

  // Open → preselect, click-outside to close.
  useEffect(() => {
    if (!open) return undefined;
    setHi(Math.max(0, options.indexOf(current)));
    const onDocDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Scroll-into-view for long lists.
  useEffect(() => {
    if (!open || !menuRef.current) return;
    const item = menuRef.current.querySelector(`[data-i="${hi}"]`);
    if (item && item.scrollIntoView) item.scrollIntoView({ block: 'nearest' });
  }, [open, hi]);

  // Native keydown — bubble phase, fires before ProseMirror's listener on the
  // ancestor .ProseMirror. stopPropagation prevents PM from moving the cursor.
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return undefined;
    const onKey = (e: KeyboardEvent) => {
      const { open: isOpen, hi: hiNow } = stateRef.current;
      const cb = cbRef.current;
      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault(); e.stopPropagation();
          setHi((i) => (i + 1) % options.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault(); e.stopPropagation();
          setHi((i) => (i - 1 + options.length) % options.length);
        } else if (e.key === 'Enter') {
          e.preventDefault(); e.stopPropagation();
          cb.choose(options[hiNow]);
        } else if (e.key === 'Escape') {
          e.preventDefault(); e.stopPropagation();
          setOpen(false);
        } else if (e.key === 'Tab') {
          e.preventDefault(); e.stopPropagation();
          setOpen(false);
          if (e.shiftKey) cb.retreat();
          else cb.advance();
        }
        return;
      }
      // closed
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault(); e.stopPropagation();
        setOpen(true);
      } else if (e.key === 'Tab') {
        e.preventDefault(); e.stopPropagation();
        if (e.shiftKey) cb.retreat();
        else cb.advance();
      }
    };
    btn.addEventListener('keydown', onKey);
    return () => btn.removeEventListener('keydown', onKey);
  }, [options]);

  const cls =
    variant && PICK_CLASS[variant] ? PICK_CLASS[variant](current) : 'tp-pick--teal';

  return (
    <span className="tp-pick-wrap" ref={wrapRef}>
      <button
        type="button"
        ref={btnRef}
        className={`tp-pick ${cls}`}
        onClick={() => setOpen((o) => !o)}
      >
        {current}
        <Chevron />
      </button>
      {open && (
        <span className="tp-menu" role="listbox" ref={menuRef}>
          {options.map((o, i) => {
            const isCur = o === current;
            const isHi = i === hi;
            return (
              <button
                type="button"
                key={o}
                data-i={i}
                className={`tp-menu-item${isCur ? ' is-sel' : ''}${isHi ? ' is-hi' : ''}`}
                onClick={() => cbRef.current.choose(o)}
                onMouseEnter={() => setHi(i)}
              >
                <span>{o}</span>
                {isCur && <span className="tp-menu-check">✓</span>}
              </button>
            );
          })}
        </span>
      )}
    </span>
  );
}

/** Multi-choice token — value is an array. Menu stays open while toggling.
 *  Keyboard flow:  ↑/↓ moves the highlight, Enter / Space toggles the current
 *  option (menu stays open), Esc closes, Tab/Shift+Tab closes and moves on.
 *  Native keydown listener (not React onKeyDown) so arrows don't leak to PM. */
interface MultiPickProps {
  value: string | string[] | undefined;
  options: string[];
  onChange: (v: string[]) => void;
  nav: Nav;
}

function MultiPick({ value, options, onChange, nav }: MultiPickProps) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLSpanElement>(null);
  const arr = Array.isArray(value) ? value : [];
  const label = arr.length ? arr.join(', ') : null;

  const stateRef = useRef<{ open: boolean; hi: number; arr: string[] }>({ open, hi, arr });
  stateRef.current = { open, hi, arr };
  const cbRef = useRef<{
    toggle: (o: string) => void;
    advance: () => void;
    retreat: () => void;
  }>({} as { toggle: (o: string) => void; advance: () => void; retreat: () => void });
  cbRef.current = {
    toggle: (o) => {
      if (o === 'None') return onChange(['None']);
      const without = arr.filter((x) => x !== 'None');
      onChange(
        without.includes(o) ? without.filter((x) => x !== o) : [...without, o],
      );
    },
    advance: () => nav.advance(btnRef.current),
    retreat: () => nav.retreat(btnRef.current),
  };

  useEffect(() => {
    if (!open) return undefined;
    setHi(0);
    const onDocDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  useEffect(() => {
    if (!open || !menuRef.current) return;
    const item = menuRef.current.querySelector(`[data-i="${hi}"]`);
    if (item && item.scrollIntoView) item.scrollIntoView({ block: 'nearest' });
  }, [open, hi]);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return undefined;
    const onKey = (e: KeyboardEvent) => {
      const { open: isOpen, hi: hiNow } = stateRef.current;
      const cb = cbRef.current;
      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault(); e.stopPropagation();
          setHi((i) => (i + 1) % options.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault(); e.stopPropagation();
          setHi((i) => (i - 1 + options.length) % options.length);
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault(); e.stopPropagation();
          cb.toggle(options[hiNow]);
        } else if (e.key === 'Escape') {
          e.preventDefault(); e.stopPropagation();
          setOpen(false);
        } else if (e.key === 'Tab') {
          e.preventDefault(); e.stopPropagation();
          setOpen(false);
          if (e.shiftKey) cb.retreat();
          else cb.advance();
        }
        return;
      }
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault(); e.stopPropagation();
        setOpen(true);
      } else if (e.key === 'Tab') {
        e.preventDefault(); e.stopPropagation();
        if (e.shiftKey) cb.retreat();
        else cb.advance();
      }
    };
    btn.addEventListener('keydown', onKey);
    return () => btn.removeEventListener('keydown', onKey);
  }, [options]);

  return (
    <span className="tp-pick-wrap" ref={wrapRef}>
      <button
        type="button"
        ref={btnRef}
        className={`tp-pick tp-pick--teal${label ? '' : ' tp-pick--empty'}`}
        onClick={() => setOpen((o) => !o)}
      >
        {label || 'select…'}
        <Chevron />
      </button>
      {open && (
        <span className="tp-menu" ref={menuRef}>
          {options.map((o, i) => {
            const on = arr.includes(o);
            const isHi = i === hi;
            return (
              <button
                type="button"
                key={o}
                data-i={i}
                className={`tp-menu-item${on ? ' is-sel' : ''}${isHi ? ' is-hi' : ''}`}
                onClick={() => cbRef.current.toggle(o)}
                onMouseEnter={() => setHi(i)}
              >
                <span className={`tp-check-box${on ? ' on' : ''}`}>{on ? '✓' : ''}</span>
                <span>{o}</span>
              </button>
            );
          })}
        </span>
      )}
    </span>
  );
}

/* ---------- Unified body-block editor (edit mode) --------------------
 *
 * ONE contentEditable `<p>` per block instead of many contentEditable text
 * spans separated by field chips. The doctor types freely across the whole
 * paragraph; field chips are inline `contentEditable=false` atoms that the
 * caret steps over. Adding or deleting a chip never splits the surrounding
 * text into new chunks — the underlying `parts` array is rebuilt from the
 * DOM after every input, so what you see in the paragraph IS the model.
 *
 * React hydrates the paragraph exactly once per structural change (chip
 * added / removed / renamed); typing between chips flows straight into the
 * text nodes without a re-render, which is what keeps the caret stable.
 */
function buildChipElement(part: ProseFieldPart): HTMLElement {
  const chip = document.createElement('span');
  chip.className = 'tp-chip';
  chip.setAttribute('data-chip', '');
  chip.setAttribute('data-f', part.f);
  chip.setAttribute('contenteditable', 'false');
  chip.setAttribute('spellcheck', 'false');

  const label = document.createElement('span');
  label.className = 'tp-chip-label';
  label.textContent = part.ph || part.f;
  chip.appendChild(label);

  if (part.unit) {
    const unit = document.createElement('span');
    unit.className = 'tp-chip-unit';
    unit.textContent = part.unit;
    chip.appendChild(unit);
  }

  const boltBtn = document.createElement('button');
  boltBtn.type = 'button';
  boltBtn.className = 'tp-chip-bolt';
  boltBtn.setAttribute('data-action', 'bolt');
  boltBtn.setAttribute('aria-label', 'Field settings');
  boltBtn.innerHTML =
    '<svg width="10" height="10" viewBox="0 0 14 14" aria-hidden="true">' +
    '<path d="M7 1.5 12 4v6L7 12.5 2 10V4Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>' +
    '<path d="M7 5v4M5 7h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
  chip.appendChild(boltBtn);

  const xBtn = document.createElement('button');
  xBtn.type = 'button';
  xBtn.className = 'tp-chip-x';
  xBtn.setAttribute('data-action', 'remove');
  xBtn.setAttribute('aria-label', 'Remove variable');
  xBtn.innerHTML =
    '<svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true">' +
    '<path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  chip.appendChild(xBtn);

  return chip;
}

function hydrateBodyPara(el: HTMLParagraphElement, parts: ProsePart[]): void {
  el.innerHTML = '';
  parts.forEach((part) => {
    if ('t' in part) {
      el.appendChild(document.createTextNode(part.t));
    } else {
      el.appendChild(buildChipElement(part));
    }
  });
  if (!el.childNodes.length) {
    // A truly-empty contentEditable collapses; a placeholder text node keeps
    // the caret placeable and the empty-state ::before ghost text visible.
    el.appendChild(document.createTextNode(''));
  }
}

function readPartsFromPara(
  el: HTMLParagraphElement,
  originalParts: ProsePart[],
): ProsePart[] {
  const byField = new Map<string, ProseFieldPart>();
  originalParts.forEach((p) => {
    if (!('t' in p)) byField.set(p.f, p);
  });

  const out: ProsePart[] = [];
  let buf = '';
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      buf += node.textContent || '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const elm = node as HTMLElement;
      if (elm.hasAttribute('data-chip')) {
        if (buf) {
          out.push({ t: buf });
          buf = '';
        }
        const f = elm.getAttribute('data-f');
        const orig = f ? byField.get(f) : undefined;
        if (orig) out.push(orig);
      } else {
        buf += elm.textContent || '';
      }
    }
  });
  if (buf) out.push({ t: buf });
  return out.length ? out : [{ t: '' }];
}

interface BodyBlockEditorProps {
  parts: ProsePart[];
  onPartsChange: (next: ProsePart[]) => void;
  onIdle: (para: HTMLParagraphElement) => void;
  onTypingResume: () => void;
}
function BodyBlockEditor({
  parts,
  onPartsChange,
  onIdle,
  onTypingResume,
}: BodyBlockEditorProps) {
  const paraRef = useRef<HTMLParagraphElement>(null);

  // Structural signature — anything not covered here (raw text changes,
  // caret moves) does NOT re-hydrate the paragraph, which is what keeps the
  // caret stable while the doctor is typing between chips.
  const structSig = parts
    .map((p) => ('t' in p ? 'T' : `F:${p.f}:${p.ph || ''}:${p.unit || ''}`))
    .join('|');

  useEffect(() => {
    if (paraRef.current) hydrateBodyPara(paraRef.current, parts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structSig]);

  const handleInput = () => {
    onTypingResume();
    if (paraRef.current) onIdle(paraRef.current);
    // Push the new parts up so downstream (info popover, save) sees them.
    // The DOM is the source of truth mid-edit; this call is idempotent and
    // never triggers a re-hydrate because structSig only reads structural
    // bits (chip identity), not raw text.
    if (paraRef.current) {
      onPartsChange(readPartsFromPara(paraRef.current, parts));
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLParagraphElement>) => {
    const target = e.target as HTMLElement;
    const actionBtn = target.closest<HTMLElement>('[data-action]');
    if (!actionBtn) return;
    e.preventDefault();
    e.stopPropagation();
    const chip = actionBtn.closest<HTMLElement>('[data-chip]');
    if (!chip) return;
    const f = chip.getAttribute('data-f');
    if (!f) return;
    if (actionBtn.getAttribute('data-action') === 'remove') {
      chip.remove();
      if (paraRef.current) {
        onPartsChange(readPartsFromPara(paraRef.current, parts));
      }
    }
    // (bolt action is handled through the Info popover so no per-chip
    //  popover is needed here.)
  };

  const handleBlur = () => {
    if (paraRef.current) {
      onPartsChange(readPartsFromPara(paraRef.current, parts));
    }
  };

  return (
    <p
      ref={paraRef}
      className="tp-p tp-p--edit"
      data-placeholder="Type here…"
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onClick={handleClick}
      onBlur={handleBlur}
    />
  );
}

interface Props {
  template: Template;
  values: TemplateValues;
  onChange: (patch: Record<string, string | string[]>) => void;
  onRemove: () => void;
  /** Called when the user presses Enter/Tab on the LAST field — moves the
   *  cursor out of the template and onto the next line of the note. */
  onExit?: () => void;
  /** Authoring mode: pencil toggles this on, Done/pencil toggles it off. */
  editing?: boolean;
  onEditToggle?: () => void;
  /** Emits the full updated `prose` array on any structural edit (text
   *  change, field add/remove). Omit to render read-only authoring UI off. */
  onProseChange?: (prose: ProseBlock[]) => void;
  /** Main title edit (separate from block headings). */
  onTitleChange?: (title: string) => void;
  /** "Save" in the header bar — persists a new, independent entry in the
   *  custom-template library under the given shortcut; never overwrites
   *  the shared template this instance started from. */
  onSaveAsTemplate?: (shortcut: string) => void;
  /** True when ProseMirror has this block NodeSelection-selected — the
   *  state right before a second Backspace deletes it. Drives the
   *  delete-warning glow. */
  pendingDelete?: boolean;
}

export default function ProseTemplateCard({
  template,
  values,
  onChange,
  onRemove,
  onExit,
  editing = false,
  onEditToggle,
  onProseChange,
  onTitleChange,
  onSaveAsTemplate,
  pendingDelete = false,
}: Props) {
  const noteRef = useRef<HTMLDivElement>(null);
  // Pass only the changed field; the parent merges against the latest values.
  const set = (field: string, v: string | string[]) => onChange({ [field]: v });

  const [boltOpenFor, setBoltOpenFor] = useState<{ blockIndex: number; partIndex: number } | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  // Idle-pill state — a floating "+" appears just below the caret when the
  // doctor pauses typing in a body text run. Clicking it drops a variable
  // at the caret position, splitting the text into { before, var, after }.
  const sheetRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [idlePill, setIdlePill] = useState<{
    blockIndex: number;
    partIndex: number;
    span: HTMLSpanElement;
    x: number;
    y: number;
  } | null>(null);
  // Shortcut is entered as a bare name; a leading "/" is displayed as a
  // fixed prefix so the doctor never has to type it.
  const [shortcutDraft, setShortcutDraft] = useState(
    (template.shortcut || '').replace(/^\/+/, ''),
  );

  const updateTitle = (text: string) => onTitleChange?.(text);

  const updateHeading = (blockIndex: number, text: string) => {
    if (!onProseChange) return;
    const next = cloneProse(template.prose!);
    next[blockIndex].heading = text;
    onProseChange(next);
  };

  const updateTextPart = (blockIndex: number, partIndex: number, text: string) => {
    if (!onProseChange) return;
    const next = cloneProse(template.prose!);
    const part = next[blockIndex].parts[partIndex];
    if ('t' in part) part.t = text;
    onProseChange(next);
  };

  const removeFieldPart = (blockIndex: number, partIndex: number) => {
    if (!onProseChange) return;
    const next = cloneProse(template.prose!);
    next[blockIndex].parts.splice(partIndex, 1);
    onProseChange(next);
  };

  const updateBlockParts = (blockIndex: number, nextParts: ProsePart[]) => {
    if (!onProseChange) return;
    const next = cloneProse(template.prose!);
    next[blockIndex].parts = JSON.parse(JSON.stringify(nextParts));
    onProseChange(next);
  };

  const updateFieldSettings = (
    blockIndex: number,
    partIndex: number,
    draft: FieldSettingsDraft,
  ) => {
    if (onProseChange) {
      const next = cloneProse(template.prose!);
      const part = next[blockIndex].parts[partIndex];
      if (!('t' in part)) {
        part.ph = draft.label.trim() || part.ph;
        part.unit = draft.unit.trim() || undefined;
        const minN = parseFloat(draft.min);
        const maxN = parseFloat(draft.max);
        part.min = Number.isFinite(minN) ? minN : undefined;
        part.max = Number.isFinite(maxN) ? maxN : undefined;
      }
      onProseChange(next);
    }
    setBoltOpenFor(null);
  };

  // Debounced "user paused typing" detector — called from the unified body
  // paragraph's onInput. The pill positions itself below the caret; a click
  // on it inserts a chip at exactly that position via range.insertNode, so
  // the surrounding text stays as one flow instead of splitting into runs.
  const idleParaRef = useRef<HTMLParagraphElement | null>(null);
  const idleBlockRef = useRef<number>(-1);
  const armIdlePill = (bi: number, para: HTMLParagraphElement) => {
    setIdlePill(null);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (!para.contains(range.startContainer)) return;
      const sheetRect = sheetRef.current?.getBoundingClientRect();
      if (!sheetRect) return;
      const caretRect = range.getBoundingClientRect();
      const paraRect = para.getBoundingClientRect();
      const hasCaret = caretRect.width || caretRect.height;
      const x = (hasCaret ? caretRect.left : paraRect.left + 12) - sheetRect.left;
      const y = (hasCaret ? caretRect.bottom : paraRect.bottom) - sheetRect.top;
      idleParaRef.current = para;
      idleBlockRef.current = bi;
      setIdlePill({ blockIndex: bi, partIndex: -1, span: para as unknown as HTMLSpanElement, x, y });
    }, 400);
  };

  const insertVariableAtIdle = () => {
    if (!idlePill || !onProseChange) return;
    const para = idleParaRef.current;
    const blockIndex = idleBlockRef.current;
    if (!para || blockIndex < 0) return;

    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (!para.contains(range.startContainer)) {
      // Caret drifted out of this paragraph — drop the pill silently.
      setIdlePill(null);
      return;
    }

    // Pick a fresh field id, build the chip, drop it at the caret.
    const taken = new Set<string>();
    template.prose!.forEach((b) =>
      b.parts.forEach((p) => {
        if (!('t' in p)) taken.add(p.f);
      }),
    );
    const f = uniqueFieldId('field', taken);
    const newField: ProseFieldPart = { f, kind: 'num', ph: 'value' };
    const chipEl = buildChipElement(newField);
    range.deleteContents();
    range.insertNode(chipEl);
    // A trailing text node so the doctor can keep typing after the chip.
    const trailing = document.createTextNode(' ');
    chipEl.parentNode?.insertBefore(trailing, chipEl.nextSibling);
    range.setStartAfter(trailing);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    // Read the paragraph back so the parts model catches up. Include the
    // new field def in the byField lookup so it survives the DOM read.
    const originalPartsForBlock: ProsePart[] = [
      ...template.prose![blockIndex].parts,
      newField,
    ];
    const nextParts = readPartsFromPara(para, originalPartsForBlock);
    updateBlockParts(blockIndex, nextParts);
    setIdlePill(null);
  };

  const handleSaveClick = () => {
    if (!onSaveAsTemplate) return;
    // Shortcut lives in the info popover now — if it's still empty, open the
    // popover so the doctor sees exactly where to type it instead of Save
    // silently doing nothing.
    if (!shortcutDraft.trim()) {
      setInfoOpen(true);
      return;
    }
    onSaveAsTemplate(shortcutDraft);
    // Saving is finishing — exit edit mode so we don't need a second "done" button.
    onEditToggle?.();
  };

  const getFields = (): HTMLElement[] =>
    noteRef.current
      ? [...noteRef.current.querySelectorAll<HTMLElement>('.tp-blank, .tp-pick')]
      : [];
  const focusField = (el: HTMLElement | null) => {
    if (!el) return;
    el.focus();
    placeCaretEnd(el);
  };
  const nav: Nav = {
    advance: (from) => {
      const f = getFields();
      const i = f.indexOf(from as HTMLElement);
      if (i >= 0 && f[i + 1]) focusField(f[i + 1]);
      // Past the last field: leave the template entirely and drop the cursor
      // on the next line of the note (falling back to a plain blur in the
      // preview modal, where there's no editor to step out into).
      else if (onExit) {
        if (from) from.blur();
        onExit();
      } else if (from) from.blur();
    },
    retreat: (from) => {
      const f = getFields();
      const i = f.indexOf(from as HTMLElement);
      if (i > 0) focusField(f[i - 1]);
    },
  };

  return (
    <div
      ref={sheetRef}
      className={`tp-sheet tp-accent--${template.accent || 'crimson'}${editing ? ' tp-sheet--editing' : ''}${pendingDelete ? ' tp-sheet--pending-delete' : ''}`}
    >
      {onEditToggle && !editing && (
        <button
          type="button"
          className="tp-pencil"
          aria-label="Edit template"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onEditToggle();
          }}
        >
          <PencilIcon />
        </button>
      )}

      <div className="tp-head">
        <span className="tp-title">
          {editing ? (
            <EditableText
              className="tp-title-editable"
              value={template.title}
              placeholder="Template name"
              onCommit={updateTitle}
            />
          ) : (
            template.title
          )}
          {editing && (
            <button
              type="button"
              className={`tp-info-btn${infoOpen ? ' tp-info-btn--active' : ''}`}
              aria-label="Template details"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setInfoOpen((o) => !o);
              }}
            >
              <InfoIcon />
            </button>
          )}
          {editing && infoOpen && (
            <InfoPopover
              title={template.title}
              shortcut={shortcutDraft}
              fields={template.prose!.flatMap((b, bi) =>
                b.parts
                  .map((p, pi) => ({ blockIndex: bi, partIndex: pi, part: p }))
                  .filter((r): r is { blockIndex: number; partIndex: number; part: ProseFieldPart } =>
                    !('t' in r.part),
                  ),
              )}
              onTitleChange={updateTitle}
              onShortcutChange={setShortcutDraft}
              onFieldChange={updateFieldSettings}
              onFieldRemove={removeFieldPart}
              onClose={() => setInfoOpen(false)}
            />
          )}
        </span>
        {editing && onSaveAsTemplate && (
          <div className="tp-save-bar" onMouseDown={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="tp-save-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleSaveClick();
              }}
            >
              Save
            </button>
            <button
              type="button"
              className="tp-cancel-btn"
              aria-label="Cancel editing"
              onClick={(e) => {
                e.stopPropagation();
                onEditToggle?.();
              }}
            >
              <XIcon />
            </button>
          </div>
        )}
      </div>

      <div className="tp-note" ref={noteRef}>
        {template.prose!.map((block, bi) => (
          <div key={bi} className="tp-block">
            {(block.heading || editing) && (
              <p className="tp-heading">
                {editing ? (
                  <EditableText
                    value={block.heading || ''}
                    placeholder="Section heading"
                    onCommit={(v) => updateHeading(bi, v)}
                  />
                ) : (
                  block.heading
                )}
              </p>
            )}
            {editing ? (
              <BodyBlockEditor
                parts={block.parts}
                onPartsChange={(next) => updateBlockParts(bi, next)}
                onIdle={(para) => armIdlePill(bi, para)}
                onTypingResume={() => setIdlePill(null)}
              />
            ) : (
              <p className="tp-p">
              {block.parts.map((part, pi) => {
                let node: React.ReactNode;
                if ('t' in part) {
                  node = <span>{part.t}</span>;
                } else if (part.kind === 'pick') {
                  node = (
                    <EditableFieldChip
                      editing={editing}
                      onRemove={() => removeFieldPart(bi, pi)}
                    >
                      <Pick
                        value={values[part.f] as string}
                        options={part.options!}
                        variant={part.variant}
                        onChange={(v) => set(part.f, v)}
                        nav={nav}
                      />
                    </EditableFieldChip>
                  );
                } else if (part.kind === 'multi') {
                  node = (
                    <EditableFieldChip
                      editing={editing}
                      onRemove={() => removeFieldPart(bi, pi)}
                    >
                      <MultiPick
                        value={values[part.f]}
                        options={part.options!}
                        onChange={(v) => set(part.f, v)}
                        nav={nav}
                      />
                    </EditableFieldChip>
                  );
                } else {
                  const flag = part.vital
                    ? vitalFlag(part.vital, values[part.f])
                    : rangeFlag(part.min, part.max, values[part.f]);
                  const boltOpen =
                    boltOpenFor?.blockIndex === bi && boltOpenFor.partIndex === pi;
                  node = (
                    <EditableFieldChip
                      editing={editing}
                      onRemove={() => removeFieldPart(bi, pi)}
                    >
                      <span className="tp-num-wrap">
                        <Blank
                          value={values[part.f] as string}
                          placeholder={part.ph}
                          long={part.kind === 'long'}
                          flagged={flag === 'low' || flag === 'high'}
                          onChange={(v) => set(part.f, v)}
                          nav={nav}
                        />
                        {part.unit && <span className="tp-unit">{part.unit}</span>}
                        {flag && <span className={`tp-flag tp-flag--${flag}`}>{flag}</span>}
                        {editing && part.kind === 'num' && (
                          <span className="tp-bolt-wrap">
                            <button
                              type="button"
                              className="tp-field-bolt"
                              aria-label="Field settings"
                              onClick={() =>
                                setBoltOpenFor(boltOpen ? null : { blockIndex: bi, partIndex: pi })
                              }
                            >
                              <BoltIcon />
                            </button>
                            {boltOpen && (
                              <FieldBoltPopover
                                initial={{
                                  label: part.ph || '',
                                  unit: part.unit || '',
                                  min: part.min != null ? String(part.min) : '',
                                  max: part.max != null ? String(part.max) : '',
                                }}
                                onSave={(draft) => updateFieldSettings(bi, pi, draft)}
                                onClose={() => setBoltOpenFor(null)}
                              />
                            )}
                          </span>
                        )}
                      </span>
                    </EditableFieldChip>
                  );
                }

                return <Fragment key={pi}>{node}</Fragment>;
              })}
              </p>
            )}
          </div>
        ))}
      </div>

      {idlePill && onProseChange && (
        <button
          type="button"
          className="tp-idle-plus"
          style={{ left: idlePill.x, top: idlePill.y + 6 }}
          aria-label="Insert variable at cursor"
          // Keep the caret in the body span so the click can read the
          // saved offset out of the current selection.
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertVariableAtIdle}
        >
          <PlusIcon />
        </button>
      )}
    </div>
  );
}
