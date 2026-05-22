/**
 * utils.js — small shared helpers for the Doctor's Notepad.
 */

/** "Ramesh Patel" -> "RP" ; "Dr. Arjun Mehta" -> "AM" */
export function getInitials(name) {
  if (!name) return '?';
  const cleaned = String(name)
    .replace(/^(dr|mr|mrs|ms|miss|prof)\.?\s+/i, '')
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** "57y 2m 5d" -> "57" */
export function ageYears(age) {
  if (age == null) return '';
  const m = String(age).match(/(\d+)\s*y/i);
  if (m) return m[1];
  const n = parseInt(age, 10);
  return Number.isNaN(n) ? String(age) : String(n);
}

/** today (or given date) -> "DD/MM/YYYY" (Indian format) */
export function formatIndianDate(d = new Date()) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** ISO date -> "17 May 2026" */
export function prettyDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** patient status -> badge modifier class */
export function statusBadgeClass(status) {
  const key = String(status || 'discharged').toLowerCase();
  return `np-badge--${key}`;
}
