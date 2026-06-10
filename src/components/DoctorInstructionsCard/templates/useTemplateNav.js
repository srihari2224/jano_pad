import { useRef, useCallback, useMemo } from 'react';

/**
 * Hook that owns a flat ordered list of field IDs across all sections of a
 * template card. Each field registers a focus() callback; the card calls
 * advance(currentFieldId) when an input's last box fills, which focuses the
 * NEXT field's first box.
 */
export function useTemplateNav() {
  const order = useRef([]);                // fieldId[] in document order
  const focusers = useRef({});             // { fieldId -> { focusFirst, focusLast } }

  const registerField = useCallback((fieldId, focusFirst, focusLast) => {
    if (!order.current.includes(fieldId)) order.current.push(fieldId);
    focusers.current[fieldId] = { focusFirst, focusLast };
    return () => {
      delete focusers.current[fieldId];
      order.current = order.current.filter((id) => id !== fieldId);
    };
  }, []);

  const advance = useCallback((currentId) => {
    const idx = order.current.indexOf(currentId);
    if (idx === -1 || idx >= order.current.length - 1) return false;
    const next = order.current[idx + 1];
    focusers.current[next]?.focusFirst?.();
    return true;
  }, []);

  const retreat = useCallback((currentId) => {
    const idx = order.current.indexOf(currentId);
    if (idx <= 0) return false;
    const prev = order.current[idx - 1];
    focusers.current[prev]?.focusLast?.();
    return true;
  }, []);

  const focusFirstField = useCallback(() => {
    const first = order.current[0];
    if (first) focusers.current[first]?.focusFirst?.();
  }, []);

  return useMemo(
    () => ({ registerField, advance, retreat, focusFirstField }),
    [registerField, advance, retreat, focusFirstField],
  );
}
