import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import type {
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
        <span className="tp-chev">▾</span>
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
        <span className="tp-chev">▾</span>
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

interface Props {
  template: Template;
  values: TemplateValues;
  onChange: (patch: Record<string, string | string[]>) => void;
  onRemove: () => void;
}

export default function ProseTemplateCard({ template, values, onChange, onRemove }: Props) {
  const noteRef = useRef<HTMLDivElement>(null);
  // Pass only the changed field; the parent merges against the latest values.
  const set = (field: string, v: string | string[]) => onChange({ [field]: v });

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
      else if (from) from.blur();
    },
    retreat: (from) => {
      const f = getFields();
      const i = f.indexOf(from as HTMLElement);
      if (i > 0) focusField(f[i - 1]);
    },
  };

  const tagIcon = TAG_ICON[template.category] || '✦';

  return (
    <div className={`tp-sheet tp-accent--${template.accent || 'crimson'}`}>
      <div className="tp-head">
        <span className="tp-tag">
          <span className="tp-tag-ico">{tagIcon}</span>
          {template.category}
        </span>
        <span className="tp-title">{template.title}</span>
        <button
          type="button"
          className="tp-x"
          aria-label="Remove note"
          onClick={onRemove}
        >
          ✕
        </button>
      </div>

      <div className="tp-note" ref={noteRef}>
        {template.prose!.map((block, bi) => (
          <div key={bi} className="tp-block">
            {block.heading && <p className="tp-heading">{block.heading}</p>}
            <p className="tp-p">
              {block.parts.map((part, pi) => {
                if ('t' in part) return <span key={pi}>{part.t}</span>;
                if (part.kind === 'pick') {
                  return (
                    <Pick
                      key={pi}
                      value={values[part.f] as string}
                      options={part.options!}
                      variant={part.variant}
                      onChange={(v) => set(part.f, v)}
                      nav={nav}
                    />
                  );
                }
                if (part.kind === 'multi') {
                  return (
                    <MultiPick
                      key={pi}
                      value={values[part.f]}
                      options={part.options!}
                      onChange={(v) => set(part.f, v)}
                      nav={nav}
                    />
                  );
                }
                const flag = part.vital ? vitalFlag(part.vital, values[part.f]) : null;
                return (
                  <span className="tp-num-wrap" key={pi}>
                    <Blank
                      value={values[part.f] as string}
                      placeholder={part.ph}
                      long={part.kind === 'long'}
                      flagged={!!flag}
                      onChange={(v) => set(part.f, v)}
                      nav={nav}
                    />
                    {flag && <span className={`tp-flag tp-flag--${flag}`}>{flag}</span>}
                  </span>
                );
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
