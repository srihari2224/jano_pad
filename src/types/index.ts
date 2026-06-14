/**
 * types/index.ts — shared domain model for the Doctor's Notepad.
 *
 * One barrel of types reused across the data layer, the TipTap editor
 * nodes/extensions, and the React components.
 */
import type { JSONContent } from '@tiptap/core';

/* ── Mentions (patients & doctors) ─────────────────────────────────────── */

export type MentionType = 'patient' | 'doctor';

/** Snapshot stored inside a patient mention chip (see normalizePatient). */
export interface PatientSnapshot {
  type: 'patient';
  id: string;
  name: string;
  mrn?: string;
  uhid?: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  status?: string;
  primaryDoctorId?: string;
  primaryPhysician?: string;
  chronicConditions: string[];
  allergies: string[];
  currentMedications: string[];
  lastVisit?: string;
  nextAppointment?: string;
}

/** Snapshot stored inside a doctor mention chip (see normalizeDoctor). */
export interface DoctorSnapshot {
  type: 'doctor';
  id: string;
  name: string;
  specialization?: string;
  designation?: string;
  department?: string;
  room?: string;
  isAvailableNow: boolean;
  availableHours?: string;
  qualifications: string[];
  phone?: string;
}

export type MentionSnapshot = PatientSnapshot | DoctorSnapshot;

/* ── Slash-command data sources ────────────────────────────────────────── */

export interface Medicine {
  id: string;
  name: string;
  category: string;
  dosageForms?: string[];
  commonDoses?: string[];
}

/** Flattened medicine × dose row used by the unified "/" menu. */
export interface MedicineDoseRow {
  medId: string;
  name: string;
  category: string;
  dosageForms: string[];
  dose: string;
}

export interface Diagnosis {
  id: string;
  name: string;
  icd: string;
  category: string;
}

export interface LabTest {
  id: string;
  name: string;
  category: string;
  turnaround?: string;
}

/* ── Templates ─────────────────────────────────────────────────────────── */

export type TemplateCategory =
  | 'assessment'
  | 'summary'
  | 'complication'
  | 'medication'
  | string;

export type TemplateAccent =
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'violet'
  | 'cyan'
  | 'green'
  | string;

export type FieldType =
  | 'bp'
  | 'decimal'
  | 'digits'
  | 'time'
  | 'select'
  | 'multiselect'
  | 'text';

/** A structured field definition (the `sections` form of a template). */
export interface Field {
  id: string;
  label: string;
  type: FieldType;
  unit?: string;
  boxes?: number;
  decimals?: number;
  max?: number;
  options?: string[];
  placeholder?: string;
}

export interface Section {
  title: string;
  fields: Field[];
}

/* Prose form — rendered by ProseTemplateCard. */
export type ProseFieldKind = 'num' | 'long' | 'pick' | 'multi';
export type VitalKind = 'bp' | 'pulse' | 'spo2';
export type PickVariant = 'type' | 'sev' | 'out';

/** A static text fragment in a prose block. */
export interface ProseTextPart {
  t: string;
}

/** An editable field fragment in a prose block. */
export interface ProseFieldPart {
  f: string;
  kind: ProseFieldKind;
  ph?: string;
  vital?: VitalKind;
  options?: string[];
  variant?: PickVariant;
}

export type ProsePart = ProseTextPart | ProseFieldPart;

export interface ProseBlock {
  heading?: string;
  parts: ProsePart[];
}

export interface Template {
  id: string;
  title: string;
  category: TemplateCategory;
  accent?: TemplateAccent;
  shortcut?: string;
  /** true for doctor-authored (localStorage) templates. */
  custom?: boolean;
  /** serializer hint → render as flowing prose, not a field list. */
  flat?: boolean;
  prose?: ProseBlock[];
  sections?: Section[];
}

/** Normalized template entry returned by getAllTemplates(). */
export interface TemplateListItem {
  id: string;
  title: string;
  description: TemplateCategory;
  template: Template;
}

/** A single template's filled values, keyed by field id. */
export type TemplateValues = Record<string, string | string[]>;

/* ── Editor / app state ────────────────────────────────────────────────── */

export type AiAction = 'polish' | 'expand' | 'summarize' | 'explain';

export type DraftStatus = 'idle' | 'saving' | 'saved';

export interface DraftTemplateInstance {
  instanceId: string;
  templateId: string;
  values: TemplateValues;
  collapsed?: boolean;
}

/** Persisted draft shape (v2). */
export interface Draft {
  version: number;
  editor: JSONContent;
  templates?: DraftTemplateInstance[];
}

/* ── Slash menu items ──────────────────────────────────────────────────── */

export type SlashKind =
  | 'medicine'
  | 'diagnosis'
  | 'labtest'
  | 'template'
  | 'action';

export interface SlashItem {
  id: string;
  kind: SlashKind;
  group: string;
  iconKey: string;
  title: string;
  description?: string;
  dose?: string;
  onSelect: (props: { editor: unknown; range: unknown }) => void;
}
