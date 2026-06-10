import { useImperativeHandle, useRef, forwardRef } from 'react';

const SelectChips = forwardRef(function SelectChips(
  { value, onChange, options, onComplete, onRetreatPast },
  ref,
) {
  const buttonRefs = useRef([]);

  useImperativeHandle(ref, () => ({
    focusFirst: () => {
      const sel = options.indexOf(value);
      buttonRefs.current[sel >= 0 ? sel : 0]?.focus();
    },
    focusLast: () => {
      const sel = options.indexOf(value);
      buttonRefs.current[sel >= 0 ? sel : 0]?.focus();
    },
    focus: () => buttonRefs.current[0]?.focus(),
  }));

  const handleKey = (e, i) => {
    if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault();
      buttonRefs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < options.length - 1) {
      e.preventDefault();
      buttonRefs.current[i + 1]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(options[i]);
      onComplete?.();
    } else if (e.key === 'Backspace' && !value) {
      e.preventDefault();
      onRetreatPast?.();
    } else if (e.key === 'Tab') {
      // let default tab behavior handle it (browser focuses next focusable)
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt, i) => {
        const selected = value === opt;
        return (
          <button
            type="button"
            key={opt}
            ref={(el) => { buttonRefs.current[i] = el; }}
            className={`chip ${selected ? 'is-selected' : ''}`}
            onClick={() => { onChange(opt); onComplete?.(); }}
            onKeyDown={(e) => handleKey(e, i)}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
});

export default SelectChips;
