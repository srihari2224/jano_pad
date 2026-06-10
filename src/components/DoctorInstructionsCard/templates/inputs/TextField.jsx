import { useImperativeHandle, useRef, forwardRef } from 'react';

const TextField = forwardRef(function TextField(
  { value = '', onChange, placeholder, onComplete, onRetreatPast },
  ref,
) {
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focusFirst: () => inputRef.current?.focus(),
    focusLast: () => {
      inputRef.current?.focus();
      const len = value?.length || 0;
      inputRef.current?.setSelectionRange(len, len);
    },
    focus: () => inputRef.current?.focus(),
  }));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onComplete?.();
    } else if (e.key === 'Backspace' && !value) {
      // empty + backspace → retreat
      e.preventDefault();
      onRetreatPast?.();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      className="text-field"
    />
  );
});

export default TextField;
