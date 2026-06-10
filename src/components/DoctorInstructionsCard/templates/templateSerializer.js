/** Returns a human-readable display string for a field's value. */
function displayValue(field, raw) {
  if (raw == null || raw === '') return '—';
  if (field.type === 'multiselect') {
    return Array.isArray(raw) && raw.length ? raw.join(', ') : '—';
  }
  if (field.type === 'decimal') {
    // strip trailing dot if no fraction entered
    return String(raw).replace(/\.$/, '');
  }
  if (field.type === 'bp') {
    return String(raw).replace(/\/$/, '');
  }
  if (field.type === 'time') {
    return String(raw).replace(/:$/, '');
  }
  return String(raw);
}

/** Plain-text serialization of a filled template (used by AI + save). */
export function toText(template, values) {
  const lines = [template.title.toUpperCase()];
  lines.push('='.repeat(template.title.length));
  for (const section of template.sections) {
    lines.push('');
    lines.push(`${section.title}:`);
    for (const f of section.fields) {
      const raw = values[f.id];
      if (raw == null || raw === '' || (Array.isArray(raw) && raw.length === 0)) continue;
      const v = displayValue(f, raw);
      lines.push(`  - ${f.label}: ${v}${f.unit ? ` ${f.unit}` : ''}`);
    }
  }
  return lines.join('\n');
}

/** Short one-line summary for a collapsed card. */
export function compactSummary(template, values) {
  const parts = [];
  outer: for (const section of template.sections) {
    for (const f of section.fields) {
      const raw = values[f.id];
      if (raw == null || raw === '' || (Array.isArray(raw) && raw.length === 0)) continue;
      const v = displayValue(f, raw);
      const short = f.label.split(' ')[0]; // e.g. "Blood Pressure" -> "Blood"
      parts.push(`${short} ${v}${f.unit ? f.unit : ''}`);
      if (parts.length >= 4) break outer;
    }
  }
  return parts.length ? parts.join(' · ') : 'Empty';
}
