/**
 * db.helpers.js
 * -------------------------------------------------------------------------
 * Query/search helpers for the Doctor's Notepad. Every function reads from
 * the local db.json fake database — there are NO external API calls.
 *
 * db.json is the read-only source of truth. These helpers only READ it.
 * -------------------------------------------------------------------------
 */
import db from './db.json';
import type {
  PatientSnapshot,
  DoctorSnapshot,
  MentionSnapshot,
  Medicine,
  MedicineDoseRow,
  Diagnosis,
  LabTest,
} from '../types';

/* ------------------------------------------------------------------ */
/* internal utilities                                                  */
/* ------------------------------------------------------------------ */

/** Lower-case a value safely (handles null/undefined/numbers). */
const lc = (value: unknown): string =>
  value == null ? '' : String(value).toLowerCase();

/** Case-insensitive "includes" match. */
const matches = (haystack: unknown, query: unknown): boolean =>
  lc(haystack).includes(lc(query).trim());

/* ------------------------------------------------------------------ */
/* normalizers — shape entities into a consistent form for the editor  */
/* ------------------------------------------------------------------ */

/**
 * Patient → mention object. This is the exact snapshot stored inside a
 * patient mention chip's node attributes at insertion time.
 */
function normalizePatient(p: any): PatientSnapshot {
  return {
    type: 'patient',
    id: p.id,
    name: p.name,
    mrn: p.mrn,
    uhid: p.uhid,
    age: p.age,
    gender: p.gender,
    bloodGroup: p.bloodGroup,
    status: p.status,
    primaryDoctorId: p.primaryPhysicianId,
    primaryPhysician: p.primaryPhysician,
    chronicConditions: p.chronicConditions || [],
    allergies: p.allergies || [],
    currentMedications: p.currentMedications || [],
    lastVisit: p.lastVisit,
    nextAppointment: p.nextAppointment,
  };
}

/**
 * Doctor → mention object. Snapshot stored inside a doctor mention chip.
 */
function normalizeDoctor(d: any): DoctorSnapshot {
  return {
    type: 'doctor',
    id: d.id,
    name: d.name,
    specialization: d.specialization,
    designation: d.designation,
    department: d.department,
    room: d.room,
    isAvailableNow: !!d.isAvailableNow,
    availableHours: d.availableHours,
    qualifications: d.qualifications || [],
    phone: d.phone,
  };
}

/* ------------------------------------------------------------------ */
/* @ mentions                                                          */
/* ------------------------------------------------------------------ */

/**
 * searchMentions(query)
 * Combined list of matching patients and doctors for the @ mention popup.
 *  - Max 8 results total, patients listed first.
 *  - If the query starts with "dr", only doctors are returned.
 *  - Matching is case-insensitive "includes" on name (+ MRN/UHID for
 *    patients, specialization for doctors).
 *
 * @param {string} query
 * @returns {Array} normalized patient/doctor objects (see normalizers above)
 */
export function searchMentions(query: string): MentionSnapshot[] {
  const q = (query || '').trim();
  const doctorsOnly = lc(q).startsWith('dr');

  const doctorResults = db.doctors
    .filter(
      (d) => !q || matches(d.name, q) || matches(d.specialization, q),
    )
    .map(normalizeDoctor);

  if (doctorsOnly) {
    return doctorResults.slice(0, 8);
  }

  const patientResults = db.patients
    .filter(
      (p) =>
        !q ||
        matches(p.name, q) ||
        matches(p.mrn, q) ||
        matches(p.uhid, q),
    )
    .map(normalizePatient);

  // Patients first, then doctors, capped at 8 total.
  return [...patientResults, ...doctorResults].slice(0, 8);
}

/* ------------------------------------------------------------------ */
/* slash-command data sources                                          */
/* ------------------------------------------------------------------ */

/**
 * searchMedicines(query) — match medicines by name or category.
 * @returns {Array} raw medicine records: { id, name, category, dosageForms, commonDoses }
 */
export function searchMedicines(query: string): Medicine[] {
  const q = (query || '').trim();
  if (!q) return db.medicines.slice();
  return db.medicines.filter(
    (m) => matches(m.name, q) || matches(m.category, q),
  );
}

/**
 * searchMedicineDoses(query) — flattened medicine × dose rows for the unified
 * "/" menu. Every common dose becomes its own selectable row, so the doctor
 * picks a medicine AND its dose in a single step.
 *
 * Matching is multi-word: each whitespace-separated word in the query must
 * appear somewhere in "name + category + dose" — so "iron 200" narrows
 * straight to the Iron Sucrose 200mg row. An empty query returns every row.
 *
 * @returns {Array} rows: { medId, name, category, dosageForms, dose }
 */
export function searchMedicineDoses(query: string): MedicineDoseRow[] {
  const words = lc(query).trim().split(/\s+/).filter(Boolean);
  const rows: MedicineDoseRow[] = [];
  for (const m of db.medicines) {
    const doses = m.commonDoses && m.commonDoses.length ? m.commonDoses : [''];
    for (const dose of doses) {
      const hay = lc(`${m.name} ${m.category} ${dose}`);
      if (words.every((w) => hay.includes(w))) {
        rows.push({
          medId: m.id,
          name: m.name,
          category: m.category,
          dosageForms: m.dosageForms || [],
          dose,
        });
      }
    }
  }
  return rows;
}

/**
 * searchDiagnoses(query) — match diagnoses by name or ICD code.
 * @returns {Array} raw diagnosis records: { id, name, icd, category }
 */
export function searchDiagnoses(query: string): Diagnosis[] {
  const q = (query || '').trim();
  if (!q) return db.diagnoses.slice();
  return db.diagnoses.filter(
    (d) => matches(d.name, q) || matches(d.icd, q),
  );
}

/**
 * searchLabTests(query) — match lab tests by name or category.
 * @returns {Array} raw lab test records: { id, name, category, turnaround }
 */
export function searchLabTests(query: string): LabTest[] {
  const q = (query || '').trim();
  if (!q) return db.labTests.slice();
  return db.labTests.filter(
    (t) => matches(t.name, q) || matches(t.category, q),
  );
}

/**
 * getAllTemplates() — every notepad template.
 * Re-exports from src/data/templates.js (structured templates).
 * Each item: { id, title, description, template }.
 */
import { getAllTemplates } from './templates';
export { getAllTemplates };

/* ------------------------------------------------------------------ */
/* single-record lookups                                               */
/* ------------------------------------------------------------------ */

/**
 * getPatientById(id) — single normalized patient, or null.
 */
export function getPatientById(id: string): PatientSnapshot | null {
  const p = db.patients.find((x) => x.id === id);
  return p ? normalizePatient(p) : null;
}

/**
 * getDoctorById(id) — single normalized doctor, or null.
 */
export function getDoctorById(id: string): DoctorSnapshot | null {
  const d = db.doctors.find((x) => x.id === id);
  return d ? normalizeDoctor(d) : null;
}

/* Default export: handy for quick console testing (e.g. `helpers.searchMentions('ram')`). */
export default {
  searchMentions,
  searchMedicines,
  searchMedicineDoses,
  searchDiagnoses,
  searchLabTests,
  getAllTemplates,
  getPatientById,
  getDoctorById,
};
