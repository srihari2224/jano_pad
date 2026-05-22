/**
 * CommandPicker.jsx — the second-level popup for slash commands that need
 * more input: /medicine, /diagnosis, /labtest, /template (searchable lists)
 * and /dosage (a mini-form).
 *
 * Rendered at the caret by DoctorNotePad. Calls onPick(payload) with the
 * chosen result, or onClose() to dismiss.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  searchMedicines,
  searchDiagnoses,
  searchLabTests,
  getAllTemplates,
} from '../../data/db.helpers';

const TITLES = {
  medicine: 'Insert medicine',
  diagnosis: 'Insert diagnosis',
  labtest: 'Insert lab test',
  template: 'Apply a template',
};

function descFor(type, item, isDose) {
  if (isDose) return '';
  if (type === 'medicine') {
    return [item.category, (item.commonDoses || []).join(', ')]
      .filter(Boolean)
      .join(' · ');
  }
  if (type === 'diagnosis') return `${item.icd} · ${item.category}`;
  if (type === 'labtest') return `${item.category} · ${item.turnaround}`;
  if (type === 'template') return item.description;
  return '';
}

/* ---- searchable list picker ----------------------------------------- */
function SearchPicker({ type, onPick, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [medStage, setMedStage] = useState(null); // chosen medicine, dose step
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [medStage]);

  const results = useMemo(() => {
    if (type === 'medicine' && medStage) {
      const doses = medStage.commonDoses || [];
      return [
        { label: 'No specific dose', dose: '' },
        ...doses.map((d) => ({ label: d, dose: d })),
      ];
    }
    if (type === 'medicine') return searchMedicines(query);
    if (type === 'diagnosis') return searchDiagnoses(query);
    if (type === 'labtest') return searchLabTests(query);
    if (type === 'template') {
      const all = getAllTemplates();
      const q = query.trim().toLowerCase();
      return q
        ? all.filter(
            (t) =>
              t.title.toLowerCase().includes(q) ||
              t.description.toLowerCase().includes(q),
          )
        : all;
    }
    return [];
  }, [type, query, medStage]);

  useEffect(() => setSelected(0), [results]);
  useEffect(() => {
    listRef.current
      ?.querySelector('.is-selected')
      ?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const isDose = type === 'medicine' && medStage;

  const choose = (item) => {
    if (!item) return;
    if (type === 'medicine' && !medStage) {
      if (item.commonDoses && item.commonDoses.length) {
        setMedStage(item);
        setQuery('');
        return;
      }
      onPick({ kind: 'medicine', medId: item.id, name: item.name, dose: '', category: item.category });
      return;
    }
    if (type === 'medicine' && medStage) {
      onPick({
        kind: 'medicine',
        medId: medStage.id,
        name: medStage.name,
        dose: item.dose,
        category: medStage.category,
      });
      return;
    }
    if (type === 'diagnosis') {
      onPick({ kind: 'diagnosis', diagId: item.id, name: item.name, icd: item.icd, category: item.category });
    } else if (type === 'labtest') {
      onPick({ kind: 'labtest', labId: item.id, name: item.name, category: item.category, turnaround: item.turnaround });
    } else if (type === 'template') {
      onPick({ kind: 'template', template: item });
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (medStage) {
        setMedStage(null);
        setQuery('');
      } else {
        onClose();
      }
      return;
    }
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => (s + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => (s - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[selected]);
    }
  };

  return (
    <div
      className="np-popup np-popup--mention"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="np-picker__head">
        <span className="np-picker__title">
          {isDose ? `Dose · ${medStage.name}` : TITLES[type]}
        </span>
      </div>
      <input
        ref={inputRef}
        className="np-picker__input"
        placeholder={
          isDose ? '↑ ↓ choose a dose · Esc to go back' : `Search ${type}…`
        }
        value={isDose ? '' : query}
        readOnly={!!isDose}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className="np-picker__list" ref={listRef}>
        {results.length === 0 && (
          <div className="np-popup__empty">No results</div>
        )}
        {results.map((item, i) => (
          <button
            type="button"
            key={item.id || item.label || i}
            className={`np-item ${i === selected ? 'is-selected' : ''}`}
            onMouseEnter={() => setSelected(i)}
            onMouseDown={(e) => {
              e.preventDefault();
              choose(item);
            }}
          >
            <span className="np-item__body">
              <span className="np-item__title">
                {item.name || item.title || item.label}
              </span>
              {!isDose && (
                <span className="np-item__desc">
                  {descFor(type, item, isDose)}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---- dosage mini-form ------------------------------------------------ */
function DosageForm({ onPick, onClose }) {
  const [med, setMed] = useState('');
  const [dose, setDose] = useState('');
  const [unit, setUnit] = useState('mg');
  const [freq, setFreq] = useState('twice daily');
  const [duration, setDuration] = useState('5 days');
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (!med.trim()) {
      firstRef.current?.focus();
      return;
    }
    const amount = dose.trim() ? `${dose.trim()}${unit}` : '';
    onPick({
      kind: 'dosage',
      text: [med.trim(), amount].filter(Boolean).join(' '),
      sig: `${freq} for ${duration}`.trim(),
    });
  };

  return (
    <form
      className="np-popup np-dosage"
      onMouseDown={(e) => e.stopPropagation()}
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div className="np-picker__head">
        <span className="np-picker__title">Medication instruction</span>
      </div>
      <label className="np-dosage__label">
        Medicine
        <input
          ref={firstRef}
          className="np-picker__input"
          value={med}
          placeholder="e.g. Paracetamol"
          onChange={(e) => setMed(e.target.value)}
        />
      </label>
      <div className="np-dosage__row">
        <label className="np-dosage__label">
          Dose
          <input
            className="np-picker__input"
            value={dose}
            placeholder="500"
            inputMode="decimal"
            onChange={(e) => setDose(e.target.value)}
          />
        </label>
        <label className="np-dosage__label">
          Unit
          <select
            className="np-picker__input"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          >
            <option>mg</option>
            <option>g</option>
            <option>ml</option>
            <option>IU</option>
            <option>mcg</option>
            <option>tab</option>
          </select>
        </label>
      </div>
      <label className="np-dosage__label">
        Frequency
        <select
          className="np-picker__input"
          value={freq}
          onChange={(e) => setFreq(e.target.value)}
        >
          <option>once daily</option>
          <option>twice daily</option>
          <option>thrice daily</option>
          <option>every 6 hours</option>
          <option>at bedtime</option>
          <option>SOS</option>
        </select>
      </label>
      <label className="np-dosage__label">
        Duration
        <input
          className="np-picker__input"
          value={duration}
          placeholder="5 days"
          onChange={(e) => setDuration(e.target.value)}
        />
      </label>
      <div className="np-dosage__actions">
        <button type="button" className="np-btn-cancel" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="np-btn-save">
          Insert
        </button>
      </div>
    </form>
  );
}

export default function CommandPicker({ type, onPick, onClose }) {
  if (type === 'dosage') return <DosageForm onPick={onPick} onClose={onClose} />;
  return <SearchPicker type={type} onPick={onPick} onClose={onClose} />;
}
