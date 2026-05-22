/**
 * SlashCommandList.jsx — the floating popup shown when the user types "/".
 * First-level command list. Filters live, keyboard navigable.
 */
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  IconPill,
  IconClipboard,
  IconFile,
  IconActivity,
  IconFlask,
  IconSyringe,
  IconCalendar,
  IconHeading,
  IconListBullet,
  IconMinus,
} from './icons';

const ICONS = {
  medicine: IconPill,
  diagnosis: IconClipboard,
  template: IconFile,
  vitals: IconActivity,
  labtest: IconFlask,
  dosage: IconSyringe,
  date: IconCalendar,
  heading: IconHeading,
  list: IconListBullet,
  divider: IconMinus,
};

const SlashCommandList = forwardRef(function SlashCommandList(
  { items, command },
  ref,
) {
  const [selected, setSelected] = useState(0);
  const listRef = useRef(null);

  useEffect(() => setSelected(0), [items]);
  useEffect(() => {
    listRef.current
      ?.querySelector('.is-selected')
      ?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const pick = (index) => {
    const item = items[index];
    if (item) command(item);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
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

  if (!items.length) {
    return (
      <div className="np-popup np-popup--slash">
        <div className="np-popup__header">
          <span className="np-popup__header-badge">/</span>
          <span className="np-popup__header-label">Commands</span>
        </div>
        <div className="np-popup__empty">No matching commands</div>
      </div>
    );
  }

  /* Split clinical vs formatting commands for grouping */
  const clinicalKeys = new Set(['medicine','diagnosis','labtest','dosage','vitals','template','date']);
  const clinical = items.filter(it => clinicalKeys.has(it.iconKey));
  const format   = items.filter(it => !clinicalKeys.has(it.iconKey));

  const renderItem = (item, i, globalIndex) => {
    const Icon = ICONS[item.iconKey];
    return (
      <button
        type="button"
        key={item.id}
        className={`np-item ${globalIndex === selected ? 'is-selected' : ''}`}
        onMouseEnter={() => setSelected(globalIndex)}
        onMouseDown={(e) => {
          e.preventDefault();
          pick(globalIndex);
        }}
      >
        <span className={`np-item__icon np-ic--${item.iconKey}`}>
          {Icon ? <Icon size={16} /> : null}
        </span>
        <span className="np-item__body">
          <span className="np-item__title">{item.title}</span>
          <span className="np-item__desc">{item.description}</span>
        </span>
      </button>
    );
  };

  return (
    <div className="np-popup np-popup--slash" ref={listRef}>
      <div className="np-popup__header">
        <span className="np-popup__header-badge">/</span>
        <span className="np-popup__header-label">Commands</span>
        <span className="np-popup__header-hint">↑↓ navigate · ↵ insert</span>
      </div>
      <div className="np-popup__items">
        {clinical.length > 0 && (
          <>
            {clinical.length < items.length && (
              <div className="np-popup__group-label">Clinical</div>
            )}
            {clinical.map((item) => renderItem(item, null, items.indexOf(item)))}
          </>
        )}
        {format.length > 0 && (
          <>
            {clinical.length > 0 && <div className="np-popup__group-divider" />}
            <div className="np-popup__group-label">Format</div>
            {format.map((item) => renderItem(item, null, items.indexOf(item)))}
          </>
        )}
        {clinical.length === 0 && format.length === 0 && items.map((item, i) =>
          renderItem(item, i, i)
        )}
      </div>
    </div>
  );
});

export default SlashCommandList;
