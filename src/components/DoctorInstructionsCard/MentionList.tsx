/**
 * MentionList.jsx — the floating popup shown when the user types "@".
 * Shows patients + doctors from db.json (via searchMentions).
 */
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { getInitials, ageYears, statusBadgeClass } from './utils';
import type { MentionSnapshot } from '../../types';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  CRITICAL: 'Critical',
  ADMITTED: 'Admitted',
  FOLLOW_UP: 'Follow-up',
  DISCHARGED: 'Discharged',
};

interface MentionListHandle {
  onKeyDown: (x: { event: KeyboardEvent }) => boolean;
}

interface MentionListProps {
  items: MentionSnapshot[];
  command: (item: MentionSnapshot) => void;
}

const MentionList = forwardRef<MentionListHandle, MentionListProps>(
  function MentionList({ items, command }, ref) {
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setSelected(0), [items]);
  useEffect(() => {
    listRef.current
      ?.querySelector('.is-selected')
      ?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const pick = (index: number) => {
    const item = items[index];
    if (item) command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (!items.length) return false;
      if (event.key === 'ArrowDown') {
        setSelected((s) => (s + 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowUp') {
        setSelected((s) => (s - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === 'Enter') {
        pick(selected);
        return true;
      }
      return false;
    },
  }));

  const renderItem = (item: MentionSnapshot, globalIndex: number) => (
    <button
      type="button"
      key={`${item.type}-${item.id}`}
      className={`np-item ${globalIndex === selected ? 'is-selected' : ''}`}
      onMouseEnter={() => setSelected(globalIndex)}
      onMouseDown={(e) => {
        e.preventDefault();
        pick(globalIndex);
      }}
    >
      <span className={`np-item__avatar np-item__avatar--${item.type}`}>
        {getInitials(item.name)}
      </span>
      <span className="np-item__body">
        <span className="np-item__title">
          {item.name}
          {item.type === 'patient' ? (
            <span className={`np-badge ${statusBadgeClass(item.status)}`}>
              {STATUS_LABEL[item.status as string] || item.status}
            </span>
          ) : item.isAvailableNow ? (
            <span className="np-badge np-badge--available">
              <span className="np-badge__dot" />
              Available
            </span>
          ) : (
            <span className="np-badge np-badge--busy">Busy</span>
          )}
        </span>
        <span className="np-item__desc">
          {item.type === 'patient'
            ? `${item.mrn} · Age ${ageYears(item.age)} · ${item.primaryPhysician}`
            : `${item.specialization} · ${item.department}`}
        </span>
      </span>
    </button>
  );

  if (!items.length) {
    return (
      <div className="np-popup np-popup--mention">
        <div className="np-popup__header">
          <span className="np-popup__header-badge">@</span>
          <span className="np-popup__header-label">Mention</span>
        </div>
        <div className="np-popup__empty">No patients or doctors found</div>
      </div>
    );
  }

  const patients = items.filter((it) => it.type === 'patient');
  const doctors  = items.filter((it) => it.type === 'doctor');

  return (
    <div className="np-popup np-popup--mention" ref={listRef}>
      <div className="np-popup__header">
        <span className="np-popup__header-badge">@</span>
        <span className="np-popup__header-label">Mention</span>
        <span className="np-popup__header-hint">↑↓ navigate · ↵ select</span>
      </div>
      <div className="np-popup__items">
        {patients.length > 0 && (
          <>
            {(patients.length < items.length) && (
              <div className="np-popup__group-label">Patients</div>
            )}
            {patients.map((item) => renderItem(item, items.indexOf(item)))}
          </>
        )}
        {doctors.length > 0 && (
          <>
            {patients.length > 0 && <div className="np-popup__group-divider" />}
            <div className="np-popup__group-label">Doctors</div>
            {doctors.map((item) => renderItem(item, items.indexOf(item)))}
          </>
        )}
      </div>
    </div>
  );
  },
);

export default MentionList;
