import { useEffect, useRef } from 'react';
import DigitBoxes from './inputs/DigitBoxes';
import DecimalBoxes from './inputs/DecimalBoxes';
import BPInput from './inputs/BPInput';
import TimeInput from './inputs/TimeInput';
import SelectChips from './inputs/SelectChips';
import MultiSelectChips from './inputs/MultiSelectChips';
import TextField from './inputs/TextField';

export default function FieldRow({ field, value, onChange, nav }) {
  const inputRef = useRef(null);

  // Register with navigation map so cross-field focus jumps work
  useEffect(() => {
    const unregister = nav.registerField(
      field.id,
      () => inputRef.current?.focusFirst?.(),
      () => inputRef.current?.focusLast?.(),
    );
    return unregister;
  }, [field.id, nav]);

  const onComplete = () => nav.advance(field.id);
  const onRetreatPast = () => nav.retreat(field.id);

  let input = null;
  switch (field.type) {
    case 'digits':
      input = (
        <DigitBoxes
          ref={inputRef}
          value={value || ''}
          onChange={onChange}
          boxes={field.boxes}
          onComplete={onComplete}
          onRetreatPast={onRetreatPast}
        />
      );
      break;
    case 'decimal':
      input = (
        <DecimalBoxes
          ref={inputRef}
          value={value || ''}
          onChange={onChange}
          boxes={field.boxes}
          decimals={field.decimals || 0}
          onComplete={onComplete}
          onRetreatPast={onRetreatPast}
        />
      );
      break;
    case 'bp':
      input = (
        <BPInput
          ref={inputRef}
          value={value || ''}
          onChange={onChange}
          onComplete={onComplete}
          onRetreatPast={onRetreatPast}
        />
      );
      break;
    case 'time':
      input = (
        <TimeInput
          ref={inputRef}
          value={value || ''}
          onChange={onChange}
          onComplete={onComplete}
          onRetreatPast={onRetreatPast}
        />
      );
      break;
    case 'select':
      input = (
        <SelectChips
          ref={inputRef}
          value={value || ''}
          onChange={onChange}
          options={field.options}
          onComplete={onComplete}
          onRetreatPast={onRetreatPast}
        />
      );
      break;
    case 'multiselect':
      input = (
        <MultiSelectChips
          ref={inputRef}
          value={value || []}
          onChange={onChange}
          options={field.options}
          onComplete={onComplete}
          onRetreatPast={onRetreatPast}
        />
      );
      break;
    case 'text':
    default:
      input = (
        <TextField
          ref={inputRef}
          value={value || ''}
          onChange={onChange}
          placeholder={field.placeholder}
          onComplete={onComplete}
          onRetreatPast={onRetreatPast}
        />
      );
      break;
  }

  return (
    <div className="grid grid-cols-[160px_minmax(0,1fr)_80px] gap-3 items-center py-2">
      <div className="field-label">{field.label}</div>
      <div className="min-w-0">{input}</div>
      <div className="field-unit">{field.unit || ''}</div>
    </div>
  );
}
