import { useImperativeHandle, useRef, forwardRef } from 'react';
import DigitBoxes from './DigitBoxes';

/**
 * TimeInput — HH:MM. Value always stored with the colon: "10:30".
 */
const TimeInput = forwardRef(function TimeInput(
  { value = '', onChange, onComplete, onRetreatPast },
  ref,
) {
  const hRef = useRef(null);
  const mRef = useRef(null);

  const colonIdx = value.indexOf(':');
  const h = colonIdx === -1 ? value : value.slice(0, colonIdx);
  const m = colonIdx === -1 ? '' : value.slice(colonIdx + 1);

  useImperativeHandle(ref, () => ({
    focusFirst: () => hRef.current?.focusFirst(),
    focusLast: () => (m ? mRef.current?.focusLast() : hRef.current?.focusLast()),
    focus: () => hRef.current?.focusFirst(),
  }));

  return (
    <div className="inline-flex items-center gap-1">
      <DigitBoxes
        ref={hRef}
        value={h}
        onChange={(next) => onChange(`${next}:${m}`)}
        boxes={2}
        onComplete={() => mRef.current?.focusFirst()}
        onRetreatPast={onRetreatPast}
      />
      <span className="digit-sep text-lg">:</span>
      <DigitBoxes
        ref={mRef}
        value={m}
        onChange={(next) => onChange(`${h}:${next}`)}
        boxes={2}
        onComplete={() => onComplete?.()}
        onRetreatPast={() => hRef.current?.focusLast()}
      />
    </div>
  );
});

export default TimeInput;
