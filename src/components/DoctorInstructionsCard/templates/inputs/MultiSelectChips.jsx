import { useImperativeHandle, useRef, forwardRef } from 'react';

const MultiSelectChips = forwardRef(function MultiSelectChips(
  { value = [], onChange, options, onComplete, onRetreatPast },
  ref,
) {
  const buttonRefs = useRef([]);
  const arr = Array.isArray(value) ? value : [];

  useImperativeHandle(ref, () => ({
    focusFirst: () => buttonRefs.current[0]?.focus(),
    focusLast: () => buttonRefs.current[options.length - 1]?.focus(),
    focus: () => buttonRefs.current[0]?.focus(),
  }));

  const toggle = (opt) => {
    if (arr.includes(opt)) onChange(arr.filter((v) => v !== opt));
    else onChange([...arr, opt]);
  };

  const handleKey = (e, i) => {
    if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault();
      buttonRefs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < options.length - 1) {
      e.preventDefault();
      buttonRefs.current[i + 1]?.focus();
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle(options[i]);
    } else if (e.key === 'Backspace' && arr.length === 0) {
      e.preventDefault();
      onRetreatPast?.();
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt, i) => {
        const selected = arr.includes(opt);
        return (
          <button
            type="button"
            key={opt}
            ref={(el) => { buttonRefs.current[i] = el; }}
            className={`chip ${selected ? 'is-selected' : ''}`}
            onClick={() => toggle(opt)}
            onKeyDown={(e) => handleKey(e, i)}
          >
            {selected ? '✓ ' : ''}{opt}
          </button>
        );
      })}
    </div>
  );
});

export default MultiSelectChips;
