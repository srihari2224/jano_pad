/**
 * SlashCommandList.jsx — the floating popup shown when the user types "/".
 *
 * A single unified list: medicines (with dose baked into each row),
 * diagnoses, lab tests and quick actions, grouped by section. One Enter
 * inserts the chip — there is no second popup. Keyboard navigable.
 */
import {
  forwardRef,
  Fragment,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  IconPill,
  IconClipboard,
  IconActivity,
  IconFlask,
  IconCalendar,
  IconHeading,
  IconListBullet,
  IconMinus,
  IconFile,
  IconAlertTriangle,
} from './icons';
import type { SlashItem } from '../../types';

const ICONS: Record<string, (props: { size?: number }) => React.JSX.Element> = {
  medicine: IconPill,
  diagnosis: IconClipboard,
  labtest: IconFlask,
  vitals: IconActivity,
  date: IconCalendar,
  heading: IconHeading,
  list: IconListBullet,
  divider: IconMinus,
  // template categories
  assessment: IconActivity,
  summary: IconFile,
  complication: IconAlertTriangle,
  medication: IconPill,
};

interface SlashCommandListHandle {
  onKeyDown: (x: { event: KeyboardEvent }) => boolean;
}

interface SlashCommandListProps {
  items: SlashItem[];
  command: (item: SlashItem) => void;
}

const SlashCommandList = forwardRef<
  SlashCommandListHandle,
  SlashCommandListProps
>(function SlashCommandList({ items, command }, ref) {
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

  if (!items.length) {
    return (
      <div className="np-popup np-popup--slash">
        <div className="np-popup__header">
          <span className="np-popup__header-badge">/</span>
          <span className="np-popup__header-label">Insert</span>
        </div>
        <div className="np-popup__empty">No matches</div>
      </div>
    );
  }

  let lastGroup: string | null = null;

  return (
    <div className="np-popup np-popup--slash" ref={listRef}>
      <div className="np-popup__header">
        <span className="np-popup__header-badge">/</span>
        <span className="np-popup__header-label">Insert</span>
        <span className="np-popup__header-hint">↑↓ navigate · ↵ insert</span>
      </div>
      <div className="np-popup__items">
        {items.map((item: SlashItem, i: number) => {
          const Icon = ICONS[item.iconKey];
          const showGroup = item.group !== lastGroup;
          lastGroup = item.group;
          return (
            <Fragment key={item.id}>
              {showGroup && (
                <div className="np-popup__group-label">{item.group}</div>
              )}
              <button
                type="button"
                className={`np-item ${i === selected ? 'is-selected' : ''}`}
                onMouseEnter={() => setSelected(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(i);
                }}
              >
                <span className={`np-item__icon np-ic--${item.iconKey}`}>
                  {Icon ? <Icon size={16} /> : null}
                </span>
                <span className="np-item__body">
                  <span className="np-item__title">
                    {item.title}
                    {item.dose ? (
                      <span className="np-item__dose">{item.dose}</span>
                    ) : null}
                  </span>
                  <span className="np-item__desc">{item.description}</span>
                </span>
              </button>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
});

export default SlashCommandList;
