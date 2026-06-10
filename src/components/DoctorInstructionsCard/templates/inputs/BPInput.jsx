import { useImperativeHandle, useRef, forwardRef } from 'react';
import DigitBoxes from './DigitBoxes';

/**
 * BPInput — 3 systolic boxes + "/" + 3 diastolic boxes.
 * Value always stored with the slash: "120/80" (trailing slash while partial).
 */
const BPInput = forwardRef(function BPInput(
  { value = '', onChange, onComplete, onRetreatPast },
  ref,
) {
  const sysRef = useRef(null);
  const diaRef = useRef(null);

  const slashIdx = value.indexOf('/');
  const sys = slashIdx === -1 ? value : value.slice(0, slashIdx);
  const dia = slashIdx === -1 ? '' : value.slice(slashIdx + 1);

  useImperativeHandle(ref, () => ({
    focusFirst: () => sysRef.current?.focusFirst(),
    focusLast: () => (dia ? diaRef.current?.focusLast() : sysRef.current?.focusLast()),
    focus: () => sysRef.current?.focusFirst(),
  }));

  return (
    <div className="inline-flex items-center gap-1">
      <DigitBoxes
        ref={sysRef}
        value={sys}
        onChange={(next) => onChange(`${next}/${dia}`)}
        boxes={3}
        onComplete={() => diaRef.current?.focusFirst()}
        onRetreatPast={onRetreatPast}
      />
      <span className="digit-sep text-lg">/</span>
      <DigitBoxes
        ref={diaRef}
        value={dia}
        onChange={(next) => onChange(`${sys}/${next}`)}
        boxes={3}
        onComplete={() => onComplete?.()}
        onRetreatPast={() => sysRef.current?.focusLast()}
      />
    </div>
  );
});

export default BPInput;
