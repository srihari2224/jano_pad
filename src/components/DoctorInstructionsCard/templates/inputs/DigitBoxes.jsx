import { useImperativeHandle, useRef, forwardRef } from 'react';

/**
 * DigitBoxes — N single-character boxes. Numeric-only by default.
 * Fully controlled: parent owns `value` (digits string, length <= boxes).
 *
 * Props:
 *   value: string
 *   onChange(nextValue: string)
 *   boxes: number
 *   onComplete(nextValue): called when the last box fills (parent moves focus on)
 *   onRetreatPast(): Backspace on the first, empty box (parent moves to prev field)
 *
 * Imperative API via ref: { focusFirst(), focusLast(), focus() }
 */
const DigitBoxes = forwardRef(function DigitBoxes(
  { value = '', onChange, boxes, onComplete, onRetreatPast },
  ref,
) {
  const inputRefs = useRef([]);

  useImperativeHandle(ref, () => ({
    focusFirst: () => {
      // focus the first empty box (or last if all filled)
      const idx = Math.min(value.length, boxes - 1);
      inputRefs.current[idx]?.focus();
    },
    focusLast: () =>
      inputRefs.current[Math.max(0, Math.min(value.length, boxes - 1))]?.focus(),
    focus: () => inputRefs.current[0]?.focus(),
  }));

  const writeAt = (idx, chars) => {
    // overwrite from idx with the given chars, clamp to box count
    const before = value.slice(0, idx).padEnd(idx, ' ');
    const next = (before + chars).slice(0, boxes).replace(/\s+$/, '');
    onChange(next);
    return next;
  };

  const handleChange = (e, idx) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits) {
      // invalid char typed — keep state as-is (controlled value re-renders)
      onChange(value);
      return;
    }
    const next = writeAt(idx, digits);
    const landing = idx + digits.length;
    if (landing >= boxes) {
      onComplete?.(next);
    } else {
      inputRefs.current[landing]?.focus();
    }
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const cur = value[idx] || '';
      if (cur) {
        // clear this box
        const next = (value.slice(0, idx) + ' ' + value.slice(idx + 1)).replace(/\s+$/, '');
        onChange(next);
      } else if (idx > 0) {
        const next = (value.slice(0, idx - 1) + ' ' + value.slice(idx)).replace(/\s+$/, '');
        onChange(next);
        inputRefs.current[idx - 1]?.focus();
      } else {
        onRetreatPast?.();
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < boxes - 1) {
      e.preventDefault();
      inputRefs.current[idx + 1]?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onComplete?.(value);
    }
  };

  const handlePaste = (e, idx) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!digits) return;
    const next = writeAt(idx, digits);
    const landing = idx + digits.length;
    if (landing >= boxes) {
      onComplete?.(next);
    } else {
      inputRefs.current[landing]?.focus();
    }
  };

  return (
    <div className="inline-flex items-center gap-1">
      {Array.from({ length: boxes }).map((_, i) => {
        const ch = (value[i] || '').trim();
        return (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={ch}
            className={`digit-box ${ch ? 'is-filled' : ''}`}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onFocus={(e) => e.target.select()}
            onPaste={(e) => handlePaste(e, i)}
          />
        );
      })}
    </div>
  );
});

export default DigitBoxes;
