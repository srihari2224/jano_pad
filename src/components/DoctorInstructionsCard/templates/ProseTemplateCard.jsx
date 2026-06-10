import { useEffect, useRef, useState } from 'react';

/* pick-token colour by variant + value */
const PICK_CLASS = {
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

const TAG_ICON = {
  complication: '⚠',
  assessment: '✦',
  summary: '✦',
  medication: '✚',
};

const onlyNum = (s) => parseInt(String(s || '').replace(/[^0-9]/g, ''), 10);

/** low / high flag for a known vital, or null */
function vitalFlag(vital, raw) {
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

function placeCaretEnd(el) {
  if (!el || !el.isContentEditable) return;
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(r);
}

/** Editable inline fragment. Content is set once on mount to avoid cursor jumps. */
function Blank({ value, placeholder, long, flagged, onChange, nav }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.textContent = value || '';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e) => {
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
      onInput={(e) => onChange(e.currentTarget.textContent)}
      onKeyDown={onKeyDown}
    />
  );
}

/** Single-choice coloured token + dropdown. */
function Pick({ value, options, variant, onChange, nav }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const current = value || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  const cls =
    variant && PICK_CLASS[variant] ? PICK_CLASS[variant](current) : 'tp-pick--teal';

  const choose = (o) => {
    onChange(o);
    setOpen(false);
    nav.advance(btnRef.current);
  };

  return (
    <span className="tp-pick-wrap" ref={wrapRef}>
      <button
        type="button"
        ref={btnRef}
        className={`tp-pick ${cls}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            e.shiftKey ? nav.retreat(btnRef.current) : nav.advance(btnRef.current);
          }
        }}
      >
        {current}
        <span className="tp-chev">▾</span>
      </button>
      {open && (
        <span className="tp-menu" role="listbox">
          {options.map((o) => (
            <button
              type="button"
              key={o}
              className={`tp-menu-item${o === current ? ' is-sel' : ''}`}
              onClick={() => choose(o)}
            >
              <span>{o}</span>
              {o === current && <span className="tp-menu-check">✓</span>}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

/** Multi-choice token — value is an array. Menu stays open while toggling. */
function MultiPick({ value, options, onChange, nav }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const arr = Array.isArray(value) ? value : [];
  const label = arr.length ? arr.join(', ') : null;

  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  const toggle = (o) => {
    // "None" is exclusive
    if (o === 'None') return onChange(['None']);
    const without = arr.filter((x) => x !== 'None');
    onChange(
      without.includes(o) ? without.filter((x) => x !== o) : [...without, o],
    );
  };

  return (
    <span className="tp-pick-wrap" ref={wrapRef}>
      <button
        type="button"
        ref={btnRef}
        className={`tp-pick tp-pick--teal${label ? '' : ' tp-pick--empty'}`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            e.shiftKey ? nav.retreat(btnRef.current) : nav.advance(btnRef.current);
          }
        }}
      >
        {label || 'select…'}
        <span className="tp-chev">▾</span>
      </button>
      {open && (
        <span className="tp-menu">
          {options.map((o) => {
            const on = arr.includes(o);
            return (
              <button
                type="button"
                key={o}
                className={`tp-menu-item${on ? ' is-sel' : ''}`}
                onClick={() => toggle(o)}
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

export default function ProseTemplateCard({ template, values, onChange, onRemove }) {
  const noteRef = useRef(null);
  // Pass only the changed field; the parent merges against the latest values.
  const set = (field, v) => onChange({ [field]: v });

  const getFields = () =>
    noteRef.current
      ? [...noteRef.current.querySelectorAll('.tp-blank, .tp-pick')]
      : [];
  const focusField = (el) => {
    if (!el) return;
    el.focus();
    placeCaretEnd(el);
  };
  const nav = {
    advance: (from) => {
      const f = getFields();
      const i = f.indexOf(from);
      if (i >= 0 && f[i + 1]) focusField(f[i + 1]);
      else if (from) from.blur();
    },
    retreat: (from) => {
      const f = getFields();
      const i = f.indexOf(from);
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
        {template.prose.map((block, bi) => (
          <div key={bi} className="tp-block">
            {block.heading && <p className="tp-heading">{block.heading}</p>}
            <p className="tp-p">
              {block.parts.map((part, pi) => {
                if (part.t !== undefined) return <span key={pi}>{part.t}</span>;
                if (part.kind === 'pick') {
                  return (
                    <Pick
                      key={pi}
                      value={values[part.f]}
                      options={part.options}
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
                      options={part.options}
                      onChange={(v) => set(part.f, v)}
                      nav={nav}
                    />
                  );
                }
                const flag = part.vital ? vitalFlag(part.vital, values[part.f]) : null;
                return (
                  <span className="tp-num-wrap" key={pi}>
                    <Blank
                      value={values[part.f]}
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
