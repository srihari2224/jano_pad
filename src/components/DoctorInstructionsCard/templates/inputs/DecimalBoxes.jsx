import { useImperativeHandle, useRef, forwardRef } from 'react';
import DigitBoxes from './DigitBoxes';

/**
 * DecimalBoxes — integer boxes (+ decimal point + fraction boxes when
 * decimals > 0). Value stored with the dot: "068.4". With decimals === 0
 * it is a plain integer field ("4000").
 */
const DecimalBoxes = forwardRef(function DecimalBoxes(
  { value = '', onChange, boxes, decimals = 0, onComplete, onRetreatPast },
  ref,
) {
  const intRef = useRef(null);
  const fracRef = useRef(null);

  const dotIdx = value.indexOf('.');
  const intPart = dotIdx === -1 ? value : value.slice(0, dotIdx);
  const fracPart = dotIdx === -1 ? '' : value.slice(dotIdx + 1);

  useImperativeHandle(ref, () => ({
    focusFirst: () => intRef.current?.focusFirst(),
    focusLast: () => {
      if (decimals > 0 && fracPart) fracRef.current?.focusLast();
      else intRef.current?.focusLast();
    },
    focus: () => intRef.current?.focusFirst(),
  }));

  if (decimals === 0) {
    return (
      <DigitBoxes
        ref={intRef}
        value={value}
        onChange={onChange}
        boxes={boxes}
        onComplete={() => onComplete?.()}
        onRetreatPast={onRetreatPast}
      />
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <DigitBoxes
        ref={intRef}
        value={intPart}
        onChange={(next) => onChange(`${next}.${fracPart}`)}
        boxes={boxes}
        onComplete={() => fracRef.current?.focusFirst()}
        onRetreatPast={onRetreatPast}
      />
      <span className="digit-sep text-lg">.</span>
      <DigitBoxes
        ref={fracRef}
        value={fracPart}
        onChange={(next) => onChange(`${intPart}.${next}`)}
        boxes={decimals}
        onComplete={() => onComplete?.()}
        onRetreatPast={() => intRef.current?.focusLast()}
      />
    </div>
  );
});

export default DecimalBoxes;
