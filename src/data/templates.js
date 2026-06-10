/**
 * templates.js
 * Structured clinical templates for the Doctor's Notepad.
 *
 * Field types:
 *   digits      — N numeric boxes, auto-advance when last box fills.
 *                 props: boxes (N), unit, max?
 *   decimal     — integer boxes + auto-jump decimal + fraction boxes.
 *                 props: boxes (integer part), decimals (fraction part), unit
 *   bp          — 3 boxes "/" 2 boxes (e.g. 120/80). unit defaults to "mmHg".
 *   time        — HH:MM (2 + 2 boxes).
 *   select      — single-choice pill row. props: options[]
 *   multiselect — checkbox pill row. props: options[]
 *   text        — free text input.    props: placeholder?
 */

export const TEMPLATES = [
  /* ───────────────────── PRE-DIALYSIS ASSESSMENT ─────────────────────── */
  {
    id: 'tmpl_pre_dialysis',
    title: 'Pre-Dialysis Assessment',
    category: 'assessment',
    accent: 'blue',
    prose: [
      {
        heading: 'Vitals on arrival',
        parts: [
          { t: 'On arrival, blood pressure ' },
          { f: 'bp', kind: 'num', ph: '—/—', vital: 'bp' },
          { t: ' mmHg, pulse ' },
          { f: 'pulse', kind: 'num', ph: '—', vital: 'pulse' },
          { t: ' bpm, SpO₂ ' },
          { f: 'spo2', kind: 'num', ph: '—', vital: 'spo2' },
          { t: ' %, temperature ' },
          { f: 'temp', kind: 'num', ph: '—' },
          { t: ' °F, weight ' },
          { f: 'weight', kind: 'num', ph: '—' },
          { t: ' kg, GRBS ' },
          { f: 'grbs', kind: 'num', ph: '—' },
          { t: ' mg/dL.' },
        ],
      },
      {
        heading: 'Vascular access',
        parts: [
          { t: 'Dialysis via ' },
          { f: 'access_type', kind: 'pick',
            options: ['AVF', 'AVG', 'Tunnelled catheter', 'Non-tunnelled catheter'] },
          { t: ' at ' },
          { f: 'access_site', kind: 'pick',
            options: ['Left forearm', 'Right forearm', 'Left upper arm', 'Right upper arm', 'Right IJV', 'Left IJV', 'Right femoral', 'Left femoral'] },
          { t: '.' },
        ],
      },
      {
        heading: 'Complaints',
        parts: [
          { f: 'complaints', kind: 'long', ph: 'e.g. mild fatigue, no chest pain…' },
        ],
      },
      {
        heading: 'Prescription',
        parts: [
          { t: 'Planned UF ' },
          { f: 'ufgoal', kind: 'num', ph: '—' },
          { t: ' L over ' },
          { f: 'duration', kind: 'num', ph: '—' },
          { t: ' min, blood flow ' },
          { f: 'bfr', kind: 'num', ph: '—' },
          { t: ' mL/min, dialysate Na⁺ ' },
          { f: 'dial_na', kind: 'num', ph: '—' },
          { t: ' / K⁺ ' },
          { f: 'dial_k', kind: 'num', ph: '—' },
          { t: ' mmol/L.' },
        ],
      },
    ],
    sections: [
      {
        title: 'Vitals on arrival',
        fields: [
          { id: 'bp',     label: 'Blood Pressure', type: 'bp',      unit: 'mmHg' },
          { id: 'weight', label: 'Weight',         type: 'decimal', boxes: 3, decimals: 1, unit: 'kg' },
          { id: 'temp',   label: 'Temperature',    type: 'decimal', boxes: 3, decimals: 1, unit: '°F' },
          { id: 'pulse',  label: 'Pulse',          type: 'digits',  boxes: 3, unit: 'bpm' },
          { id: 'spo2',   label: 'SpO₂',           type: 'digits',  boxes: 3, unit: '%', max: 100 },
          { id: 'grbs',   label: 'GRBS',           type: 'digits',  boxes: 3, unit: 'mg/dL' },
        ],
      },
      {
        title: 'Vascular access',
        fields: [
          { id: 'access_type', label: 'Type', type: 'select',
            options: ['AVF', 'AVG', 'Tunnelled catheter', 'Non-tunnelled catheter'] },
          { id: 'access_site', label: 'Site', type: 'select',
            options: ['Left forearm', 'Right forearm', 'Left upper arm', 'Right upper arm', 'Right IJV', 'Left IJV', 'Right femoral', 'Left femoral'] },
        ],
      },
      {
        title: 'Complaints',
        fields: [
          { id: 'complaints', label: 'Patient complaints', type: 'text', placeholder: 'e.g. mild fatigue, no chest pain…' },
        ],
      },
      {
        title: 'Prescription',
        fields: [
          { id: 'ufgoal',   label: 'Prescribed UF', type: 'decimal', boxes: 1, decimals: 1, unit: 'L' },
          { id: 'duration', label: 'Duration',      type: 'digits',  boxes: 3, unit: 'min' },
          { id: 'bfr',      label: 'Blood flow',    type: 'digits',  boxes: 3, unit: 'mL/min' },
          { id: 'dial_na',  label: 'Dialysate Na⁺', type: 'digits',  boxes: 3, unit: 'mmol/L' },
          { id: 'dial_k',   label: 'Dialysate K⁺',  type: 'decimal', boxes: 1, decimals: 1, unit: 'mmol/L' },
        ],
      },
    ],
  },

  /* ───────────────────── POST-DIALYSIS NOTE ─────────────────────────── */
  {
    id: 'tmpl_post_dialysis',
    title: 'Post-Dialysis Note',
    category: 'summary',
    accent: 'emerald',
    prose: [
      {
        heading: 'Vitals',
        parts: [
          { t: 'Post-dialysis blood pressure ' },
          { f: 'bp', kind: 'num', ph: '—/—', vital: 'bp' },
          { t: ' mmHg, pulse ' },
          { f: 'pulse', kind: 'num', ph: '—', vital: 'pulse' },
          { t: ' bpm, SpO₂ ' },
          { f: 'spo2', kind: 'num', ph: '—', vital: 'spo2' },
          { t: ' %, temperature ' },
          { f: 'temp', kind: 'num', ph: '—' },
          { t: ' °F, weight ' },
          { f: 'weight', kind: 'num', ph: '—' },
          { t: ' kg.' },
        ],
      },
      {
        heading: 'Session',
        parts: [
          { t: 'UF achieved ' },
          { f: 'uf', kind: 'num', ph: '—' },
          { t: ' L over ' },
          { f: 'duration', kind: 'num', ph: '—' },
          { t: ' min via ' },
          { f: 'access', kind: 'pick',
            options: ['AVF', 'AVG', 'Tunnelled catheter', 'Non-tunnelled catheter'] },
          { t: '. Complications: ' },
          { f: 'complications', kind: 'multi',
            options: ['None', 'Hypotension', 'Cramps', 'Nausea', 'Headache', 'Chills', 'Arrhythmia'] },
          { t: '.' },
        ],
      },
      {
        heading: 'Disposition',
        parts: [
          { t: 'Patient ' },
          { f: 'condition', kind: 'pick', variant: 'out',
            options: ['Stable', 'Improved', 'Unchanged', 'Worsened'] },
          { t: ' at end of session. ' },
          { f: 'notes', kind: 'long', ph: 'Additional notes…' },
        ],
      },
    ],
    sections: [
      {
        title: 'Vitals',
        fields: [
          { id: 'bp',     label: 'Blood Pressure', type: 'bp',      unit: 'mmHg' },
          { id: 'weight', label: 'Weight',         type: 'decimal', boxes: 3, decimals: 1, unit: 'kg' },
          { id: 'spo2',   label: 'SpO₂',           type: 'digits',  boxes: 3, unit: '%', max: 100 },
          { id: 'pulse',  label: 'Pulse',          type: 'digits',  boxes: 3, unit: 'bpm' },
          { id: 'temp',   label: 'Temperature',    type: 'decimal', boxes: 3, decimals: 1, unit: '°F' },
        ],
      },
      {
        title: 'Session',
        fields: [
          { id: 'uf',           label: 'UF Achieved', type: 'decimal', boxes: 1, decimals: 1, unit: 'L' },
          { id: 'duration',     label: 'Duration',    type: 'digits',  boxes: 3, unit: 'min' },
          { id: 'access',       label: 'Access used', type: 'select',
            options: ['AVF', 'AVG', 'Tunnelled catheter', 'Non-tunnelled catheter'] },
          { id: 'complications', label: 'Complications', type: 'multiselect',
            options: ['None', 'Hypotension', 'Cramps', 'Nausea', 'Headache', 'Chills', 'Arrhythmia'] },
        ],
      },
      {
        title: 'Disposition',
        fields: [
          { id: 'condition', label: 'Patient condition', type: 'select',
            options: ['Stable', 'Improved', 'Unchanged', 'Worsened'] },
          { id: 'notes', label: 'Additional notes', type: 'text', placeholder: 'Optional…' },
        ],
      },
    ],
  },

  /* ───────────────────── COMPLICATION NOTE ───────────────────────────── */
  {
    id: 'tmpl_complication',
    title: 'Complication Note',
    category: 'complication',
    accent: 'amber',
    /* `prose` → rendered as an editable note (ProseTemplateCard). Field ids
       below must also exist in `sections` so save/serialize keeps working. */
    prose: [
      {
        heading: 'Event',
        parts: [
          { t: 'At ' },
          { f: 'time', kind: 'num', ph: '00:00' },
          { t: ' hrs into the session, the patient developed ' },
          { f: 'event', kind: 'pick',
            options: ['Hypotension', 'Cramps', 'Nausea / Vomiting', 'Chest pain', 'Dyspnoea', 'Arrhythmia', 'Bleeding', 'Other'] },
          { t: ', graded ' },
          { f: 'severity', kind: 'pick', variant: 'sev', options: ['Mild', 'Moderate', 'Severe'] },
          { t: '. ' },
          { f: 'desc', kind: 'long', ph: 'Add what was observed…' },
        ],
      },
      {
        heading: 'Vitals at the time',
        parts: [
          { t: 'Blood pressure ' },
          { f: 'bp', kind: 'num', ph: '—/—', vital: 'bp' },
          { t: ' mmHg, pulse ' },
          { f: 'pulse', kind: 'num', ph: '—', vital: 'pulse' },
          { t: ' bpm, SpO₂ ' },
          { f: 'spo2', kind: 'num', ph: '—', vital: 'spo2' },
          { t: ' %.' },
        ],
      },
      {
        heading: 'Response',
        parts: [
          { f: 'intervention', kind: 'long', ph: 'Note the intervention given…' },
          { t: ' The event is currently ' },
          { f: 'outcome', kind: 'pick', variant: 'out',
            options: ['Resolved', 'Resolving', 'Ongoing', 'Escalated'] },
          { t: '.' },
        ],
      },
    ],
    sections: [
      {
        title: 'Event',
        fields: [
          { id: 'time',  label: 'Time',  type: 'time' },
          { id: 'event', label: 'Event type', type: 'select',
            options: ['Hypotension', 'Cramps', 'Nausea / Vomiting', 'Chest pain', 'Dyspnoea', 'Arrhythmia', 'Bleeding', 'Other'] },
          { id: 'severity', label: 'Severity', type: 'select',
            options: ['Mild', 'Moderate', 'Severe'] },
          { id: 'desc',  label: 'Description', type: 'text', placeholder: 'Brief description…' },
        ],
      },
      {
        title: 'Vitals at event',
        fields: [
          { id: 'bp',    label: 'BP',    type: 'bp',     unit: 'mmHg' },
          { id: 'pulse', label: 'Pulse', type: 'digits', boxes: 3, unit: 'bpm' },
          { id: 'spo2',  label: 'SpO₂',  type: 'digits', boxes: 3, unit: '%', max: 100 },
        ],
      },
      {
        title: 'Response',
        fields: [
          { id: 'intervention', label: 'Intervention', type: 'text', placeholder: 'e.g. 200mL NS bolus, UF rate reduced…' },
          { id: 'outcome',      label: 'Outcome', type: 'select',
            options: ['Resolved', 'Resolving', 'Ongoing', 'Escalated'] },
        ],
      },
    ],
  },

  /* ───────────────────── MEDICATION ADMINISTRATION ───────────────────── */
  {
    id: 'tmpl_medication',
    title: 'Medication Administration',
    category: 'medication',
    accent: 'violet',
    prose: [
      {
        heading: 'Drug',
        parts: [
          { t: 'Administered ' },
          { f: 'drug', kind: 'long', ph: 'drug name' },
          { t: ' ' },
          { f: 'dose', kind: 'num', ph: '—' },
          { t: ' ' },
          { f: 'unit', kind: 'pick', options: ['mg', 'mL', 'IU', 'g', 'mcg'] },
          { t: '.' },
        ],
      },
      {
        heading: 'Administration',
        parts: [
          { t: 'Given ' },
          { f: 'route', kind: 'pick', options: ['IV', 'IM', 'SC', 'PO', 'SL', 'IH'] },
          { t: ' at ' },
          { f: 'time', kind: 'num', ph: '00:00' },
          { t: ' hrs by ' },
          { f: 'givenby', kind: 'long', ph: 'nurse / doctor name' },
          { t: '.' },
        ],
      },
    ],
    sections: [
      {
        title: 'Drug',
        fields: [
          { id: 'drug', label: 'Drug name', type: 'text', placeholder: 'e.g. Erythropoietin' },
          { id: 'dose', label: 'Dose',      type: 'decimal', boxes: 4, decimals: 0 },
          { id: 'unit', label: 'Unit',      type: 'select', options: ['mg', 'mL', 'IU', 'g', 'mcg'] },
        ],
      },
      {
        title: 'Administration',
        fields: [
          { id: 'route',  label: 'Route', type: 'select', options: ['IV', 'IM', 'SC', 'PO', 'SL', 'IH'] },
          { id: 'time',   label: 'Time given', type: 'time' },
          { id: 'givenby', label: 'Given by', type: 'text', placeholder: 'Nurse/Doctor name' },
        ],
      },
    ],
  },

  /* ───────────────────── INTRADIALYTIC HYPOTENSION ───────────────────── */
  {
    id: 'tmpl_idh',
    title: 'Intradialytic Hypotension Episode',
    category: 'complication',
    accent: 'amber',
    prose: [
      {
        heading: 'Episode',
        parts: [
          { t: 'At ' },
          { f: 'time', kind: 'num', ph: '00:00' },
          { t: ' hrs, blood pressure dropped to ' },
          { f: 'bp_drop', kind: 'num', ph: '—/—', vital: 'bp' },
          { t: ' mmHg. Symptoms: ' },
          { f: 'symptoms', kind: 'multi',
            options: ['Dizziness', 'Nausea', 'Cramps', 'Diaphoresis', 'LOC', 'Chest pain'] },
          { t: '.' },
        ],
      },
      {
        heading: 'Intervention',
        parts: [
          { f: 'saline', kind: 'num', ph: '—' },
          { t: ' mL saline given; blood pressure recovered to ' },
          { f: 'bp_after', kind: 'num', ph: '—/—', vital: 'bp' },
          { t: ' mmHg. Episode resolved: ' },
          { f: 'resolved', kind: 'pick', variant: 'out', options: ['Yes', 'No', 'Partial'] },
          { t: '.' },
        ],
      },
    ],
    sections: [
      {
        title: 'Episode',
        fields: [
          { id: 'time',     label: 'Time of drop', type: 'time' },
          { id: 'bp_drop',  label: 'BP at drop',   type: 'bp',     unit: 'mmHg' },
          { id: 'symptoms', label: 'Symptoms',     type: 'multiselect',
            options: ['Dizziness', 'Nausea', 'Cramps', 'Diaphoresis', 'LOC', 'Chest pain'] },
        ],
      },
      {
        title: 'Intervention',
        fields: [
          { id: 'saline',   label: 'Saline given', type: 'decimal', boxes: 3, decimals: 0, unit: 'mL' },
          { id: 'bp_after', label: 'BP after',     type: 'bp',      unit: 'mmHg' },
          { id: 'resolved', label: 'Resolved?',    type: 'select',  options: ['Yes', 'No', 'Partial'] },
        ],
      },
    ],
  },

  /* ───────────────────── VASCULAR ACCESS ASSESSMENT ──────────────────── */
  {
    id: 'tmpl_access_assess',
    title: 'Vascular Access Assessment',
    category: 'assessment',
    accent: 'blue',
    prose: [
      {
        heading: 'Access',
        parts: [
          { t: 'Assessed ' },
          { f: 'type', kind: 'pick',
            options: ['AVF', 'AVG', 'Tunnelled catheter', 'Non-tunnelled catheter'] },
          { t: ' at ' },
          { f: 'site', kind: 'pick',
            options: ['Left forearm', 'Right forearm', 'Left upper arm', 'Right upper arm', 'Right IJV', 'Left IJV', 'Right femoral', 'Left femoral'] },
          { t: '.' },
        ],
      },
      {
        heading: 'Findings',
        parts: [
          { t: 'Thrill ' },
          { f: 'thrill', kind: 'pick', options: ['Strong', 'Weak', 'Absent'] },
          { t: ', bruit ' },
          { f: 'bruit', kind: 'pick', options: ['Present', 'Absent'] },
          { t: '. Signs of infection: ' },
          { f: 'infection', kind: 'multi',
            options: ['None', 'Redness', 'Swelling', 'Tenderness', 'Discharge', 'Fever'] },
          { t: '. ' },
          { f: 'notes', kind: 'long', ph: 'Additional notes…' },
        ],
      },
    ],
    sections: [
      {
        title: 'Access',
        fields: [
          { id: 'type', label: 'Type', type: 'select',
            options: ['AVF', 'AVG', 'Tunnelled catheter', 'Non-tunnelled catheter'] },
          { id: 'site', label: 'Site', type: 'select',
            options: ['Left forearm', 'Right forearm', 'Left upper arm', 'Right upper arm', 'Right IJV', 'Left IJV', 'Right femoral', 'Left femoral'] },
        ],
      },
      {
        title: 'Findings',
        fields: [
          { id: 'thrill',    label: 'Thrill',    type: 'select', options: ['Strong', 'Weak', 'Absent'] },
          { id: 'bruit',     label: 'Bruit',     type: 'select', options: ['Present', 'Absent'] },
          { id: 'infection', label: 'Signs of infection', type: 'multiselect',
            options: ['None', 'Redness', 'Swelling', 'Tenderness', 'Discharge', 'Fever'] },
          { id: 'notes',     label: 'Notes',     type: 'text', placeholder: 'Optional…' },
        ],
      },
    ],
  },

  /* ───────────────────── FLUID BALANCE CHART ─────────────────────────── */
  {
    id: 'tmpl_fluid_balance',
    title: 'Fluid Balance Chart',
    category: 'summary',
    accent: 'cyan',
    prose: [
      {
        heading: 'Inputs',
        parts: [
          { t: 'Oral intake ' },
          { f: 'po', kind: 'num', ph: '—' },
          { t: ' mL, IV intake ' },
          { f: 'iv', kind: 'num', ph: '—' },
          { t: ' mL.' },
        ],
      },
      {
        heading: 'Outputs',
        parts: [
          { t: 'Urine output ' },
          { f: 'urine', kind: 'num', ph: '—' },
          { t: ' mL, other losses ' },
          { f: 'other', kind: 'num', ph: '—' },
          { t: ' mL.' },
        ],
      },
    ],
    sections: [
      {
        title: 'Inputs',
        fields: [
          { id: 'po', label: 'PO intake', type: 'decimal', boxes: 4, decimals: 0, unit: 'mL' },
          { id: 'iv', label: 'IV intake', type: 'decimal', boxes: 4, decimals: 0, unit: 'mL' },
        ],
      },
      {
        title: 'Outputs',
        fields: [
          { id: 'urine', label: 'Urine output', type: 'decimal', boxes: 4, decimals: 0, unit: 'mL' },
          { id: 'other', label: 'Other losses', type: 'decimal', boxes: 4, decimals: 0, unit: 'mL' },
        ],
      },
    ],
  },

  /* ───────────────────── DISCHARGE INSTRUCTIONS ──────────────────────── */
  {
    id: 'tmpl_discharge',
    title: 'Discharge Instructions',
    category: 'summary',
    accent: 'emerald',
    prose: [
      {
        heading: 'Restrictions',
        parts: [
          { t: 'Restrict fluids to ' },
          { f: 'fluid_restriction', kind: 'num', ph: '—' },
          { t: ' L/day. Advised ' },
          { f: 'diet', kind: 'pick',
            options: ['Renal diet', 'Diabetic renal', 'Low-K', 'Low-Na', 'Normal'] },
          { t: ' diet.' },
        ],
      },
      {
        heading: 'Follow-up',
        parts: [
          { t: 'Next dialysis ' },
          { f: 'next_dialysis', kind: 'long', ph: 'e.g. Wed 8 AM' },
          { t: '; next OPD ' },
          { f: 'next_opd', kind: 'long', ph: 'e.g. 18 Jun 2026' },
          { t: '. Watch for: ' },
          { f: 'warnings', kind: 'multi',
            options: ['Breathlessness', 'Chest pain', 'Fever', 'Bleeding from access', 'Severe cramps', 'Reduced urine'] },
          { t: '.' },
        ],
      },
    ],
    sections: [
      {
        title: 'Restrictions',
        fields: [
          { id: 'fluid_restriction', label: 'Fluid restriction', type: 'decimal', boxes: 1, decimals: 1, unit: 'L/day' },
          { id: 'diet',              label: 'Diet', type: 'select',
            options: ['Renal diet', 'Diabetic renal', 'Low-K', 'Low-Na', 'Normal'] },
        ],
      },
      {
        title: 'Follow-up',
        fields: [
          { id: 'next_dialysis', label: 'Next dialysis', type: 'text', placeholder: 'e.g. Wed 8 AM' },
          { id: 'next_opd',      label: 'Next OPD',      type: 'text', placeholder: 'e.g. 18 Jun 2026' },
          { id: 'warnings',      label: 'Warning signs to watch', type: 'multiselect',
            options: ['Breathlessness', 'Chest pain', 'Fever', 'Bleeding from access', 'Severe cramps', 'Reduced urine'] },
        ],
      },
    ],
  },
];

/** Public accessor used elsewhere in the code. */
export function getAllTemplates() {
  return TEMPLATES.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.category,
    template: t,
  }));
}

export function getTemplateById(id) {
  return TEMPLATES.find((t) => t.id === id) || null;
}
