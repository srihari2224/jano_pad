/**
 * DoctorNotePad.jsx
 * -------------------------------------------------------------------------
 * The Doctor's Notepad — a fully featured TipTap rich-text editor.
 *
 * The "/" menu is a single unified step: typing "/erythro 6000" searches
 * medicines (dose baked into each row), diagnoses and lab tests directly —
 * one Enter inserts the chip, with no second popup. Quick actions (vitals,
 * date, heading…) live in the same menu. Note templates are applied from
 * the header dropdown.
 * -------------------------------------------------------------------------
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import type {
  AiAction,
  Diagnosis,
  DraftStatus,
  EditorApi,
  LabTest,
  MedicineDoseRow,
  MentionSnapshot,
  ParameterRow,
  SlashItem,
  Template,
  TemplateAccent,
  TemplateCategory,
  TemplateListItem,
} from '../../types';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';

import { MedicineNode } from './editor/nodes/MedicineNode';
import { DiagnosisNode } from './editor/nodes/DiagnosisNode';
import { LabTestNode } from './editor/nodes/LabTestNode';
import { TemplateNode } from './editor/nodes/TemplateNode';
import { markTemplateInserted } from './editor/nodes/templateFocusSignal';
import { SlashCommands } from './editor/extensions/SlashCommands';
import { AiLoading } from './editor/extensions/AiLoading';
import { buildMentionExtension } from './editor/extensions/MentionChip';
import { makeSuggestionRender } from './editor/extensions/suggestionRender';
import {
  searchMentions,
  searchMedicineDoses,
  searchDiagnoses,
  searchLabTests,
  getAllTemplates,
} from '../../data/db.helpers';
import { getTemplateById } from '../../data/templates';
import {
  addCustomTemplate,
  assembleTemplateFromAi,
  buildTemplateFromStructured,
  subscribeCustomTemplates,
} from '../../data/customTemplates';

import SlashCommandList from './SlashCommandList';
import MentionList from './MentionList';
import MentionPopover from './MentionPopover';
import ProseTemplateCard from './templates/ProseTemplateCard';
import { toText as templateToText } from './templates/templateSerializer';
import {
  IconCheck,
  IconSpinner,
  IconSparkles,
  IconPlus,
  IconTemplatePlus,
  IconClose,
} from './icons';
import { formatIndianDate } from './utils';
import { runAiAction, isAiConfigured } from './aiActions';
import './styles/notepad.css';
import './styles/ai-features.css';

const PLACEHOLDER_TEXT =
  'Start typing, or press / to insert, @ to mention a patient or doctor...';

/* HTML for the /vitals editable table. */
const VITALS_TABLE_HTML = `
<table>
<tbody>
<tr><th>Parameter</th><th>Value</th><th>Unit</th><th>Time</th></tr>
<tr><td>Blood Pressure</td><td></td><td>mmHg</td><td></td></tr>
<tr><td>Heart Rate</td><td></td><td>bpm</td><td></td></tr>
<tr><td>Temperature</td><td></td><td>&deg;F</td><td></td></tr>
<tr><td>SpO2</td><td></td><td>%</td><td></td></tr>
<tr><td>Weight</td><td></td><td>kg</td><td></td></tr>
<tr><td>Height</td><td></td><td>cm</td><td></td></tr>
</tbody>
</table>`;

/* Quick actions — "/" items that run immediately, no search needed. */
const QUICK_ACTIONS = [
  { id: 'vitals', title: 'Vitals Table', description: 'Insert an editable vitals table', iconKey: 'vitals', action: 'vitals' },
  { id: 'date', title: 'Date', description: "Insert today's date", iconKey: 'date', action: 'date' },
  { id: 'heading', title: 'Heading', description: 'Make this line a heading', iconKey: 'heading', action: 'heading' },
  { id: 'list', title: 'Bullet List', description: 'Start a bullet list', iconKey: 'list', action: 'list' },
  { id: 'divider', title: 'Divider', description: 'Insert a horizontal line', iconKey: 'divider', action: 'divider' },
];

/* Note templates are read fresh via getAllTemplates() inside buildSlashItems
   so AI-authored custom templates appear the moment they are saved. */

/* AI actions — shown in the toolbar "AI" dropdown.
 * mode 'replace' swaps the selection/note for the result;
 * mode 'append' adds the result to the end of the note under a heading. */
const AI_ACTIONS = [
  {
    id: 'polish',
    label: 'Polish & fix grammar',
    description: 'Correct spelling, grammar and clarity',
    mode: 'replace',
  },
  {
    id: 'expand',
    label: 'Expand & enrich',
    description: 'Turn shorthand into full clinical prose',
    mode: 'replace',
  },
  {
    id: 'summarize',
    label: 'Summarize note',
    description: 'Add a concise clinical summary',
    mode: 'append',
    heading: 'Summary',
  },
  {
    id: 'explain',
    label: 'Explain medical terms',
    description: 'Add brief notes on drugs & conditions',
    mode: 'append',
    heading: 'Medical Terms',
  },
];

/* Optional type-filter keywords for the "/" menu: "/med epo", "/dx ckd". */
const FILTER_KEYWORDS: Record<string, string> = {
  medicine: 'medicine', medicines: 'medicine', med: 'medicine', meds: 'medicine', rx: 'medicine',
  diagnosis: 'diagnosis', diagnoses: 'diagnosis', diag: 'diagnosis', dx: 'diagnosis',
  lab: 'labtest', labs: 'labtest', labtest: 'labtest', test: 'labtest', tests: 'labtest',
  template: 'template', templates: 'template', tmpl: 'template', form: 'template',
};

/** Split a "/" query into an optional type filter and the search term. */
function parseSlashQuery(raw: string): { filter: string | null; term: string } {
  const q = (raw || '').replace(/\s+/g, ' ').replace(/^\s+/, '');
  const space = q.indexOf(' ');
  const head = (space > 0 ? q.slice(0, space) : q).toLowerCase();
  if (FILTER_KEYWORDS[head]) {
    return {
      filter: FILTER_KEYWORDS[head],
      term: space > 0 ? q.slice(space + 1).trim() : '',
    };
  }
  return { filter: null, term: q.trim() };
}

/* --- recently-used medicines (per patient, localStorage) ----------- */
const RECENT_MAX = 6;
const recentKey = (pid: string) => `recent_medicines_${pid}`;

function getRecentMedicines(pid: string): MedicineDoseRow[] {
  try {
    const list = JSON.parse(localStorage.getItem(recentKey(pid)) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function rememberMedicine(pid: string, med: MedicineDoseRow) {
  try {
    const sig = (m: MedicineDoseRow) => `${m.medId}|${m.dose}`;
    const next = [
      med,
      ...getRecentMedicines(pid).filter((m) => sig(m) !== sig(med)),
    ].slice(0, RECENT_MAX);
    localStorage.setItem(recentKey(pid), JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/**
 * Plain-text representation of an inline atom node (chip), used when extracting
 * a selection for AI polishing. Mirrors each node's renderHTML/renderText so the
 * AI sees the same [Rx: ...] / [Dx: ...] / [Lab: ...] / @name tokens as getText().
 */
function leafTextForNode(node: any): string {
  const a = node.attrs || {};
  switch (node.type.name) {
    case 'medicineChip':
      return a.dose ? `[Rx: ${a.name} ${a.dose}]` : `[Rx: ${a.name}]`;
    case 'diagnosisChip':
      return a.icd ? `[Dx: ${a.icd} ${a.name}]` : `[Dx: ${a.name}]`;
    case 'labTestChip':
      return `[Lab: ${a.name}]`;
    case 'mention':
      return `@${a.label || ''}`;
    case 'templateBlock': {
      const tpl = getTemplateById(a.templateId);
      return tpl ? templateToText(tpl, a.values || {}) : '';
    }
    default:
      return '';
  }
}

/** Tiny extension: Ctrl/Cmd+S triggers Save. */
const SaveShortcut = Extension.create({
  name: 'saveShortcut',
  addOptions() {
    return { onSave: () => {} };
  },
  addKeyboardShortcuts() {
    return {
      'Mod-s': () => {
        this.options.onSave();
        return true;
      },
    };
  },
});

/** Count words and lines from the editor's plain text. */
function getCounts(editor: Editor | null): { words: number; lines: number } {
  if (!editor) return { words: 0, lines: 0 };
  const text = editor.getText({ blockSeparator: '\n' });
  const words = (text.match(/\S+/g) || []).length;
  const lines = text.length ? text.split('\n').length : 1;
  return { words, lines };
}

interface Props {
  patientId?: string;
  initialContent?: any;
  onSave?: (draft: any) => void;
  onCancel?: () => void;
  /** Hands an imperative API up to the shell once the editor is ready. */
  onReady?: (api: EditorApi | null) => void;
}

/** State shape for the @-mention popover. */
interface MentionPopoverState {
  data: MentionSnapshot;
  top: number;
  left: number;
}

/** State shape for the floating selection AI bubble. */
interface SelMenuState {
  top: number;
  left: number;
}

/** State shape for the structured "Add Template" modal (P2-0). */
interface TmplModalState {
  step: 'compose' | 'generating' | 'preview' | 'error';
  description: string;
  rows: ParameterRow[];
  name: string;
  shortcut: string;
  category: TemplateCategory;
  accent: TemplateAccent;
  generated: Template | null;
  error: string;
}

export default function DoctorNotePad({
  patientId = 'pat001',
  initialContent = null,
  onSave,
  onCancel,
  onReady,
}: Props) {
  const [headerSaved, setHeaderSaved] = useState(true);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>('idle'); // idle | saving | saved
  const [restored, setRestored] = useState(false);
  const [mentionPopover, setMentionPopover] = useState<MentionPopoverState | null>(null); // { data, top, left }
  const [selMenu, setSelMenu] = useState<SelMenuState | null>(null); // { top, left } for selection AI button
  const [selAiOpen, setSelAiOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false); // an inline AI action is in flight
  const [aiError, setAiError] = useState<string | null>(null); // transient error toast text
  // Template-creator modal:
  // { status:'loading'|'ready'|'error', source, generated, name, shortcut, error }
  const [tmplModal, setTmplModal] = useState<TmplModalState | null>(null);
  const [tmplSaved, setTmplSaved] = useState<string | null>(null); // brief "saved" confirmation text
  const [, forceTick] = useState(0); // bump to re-render when custom templates change
  const autosaveTimer = useRef<number | null>(null);
  const handleSaveRef = useRef<() => void>(() => {});

  /* --- persistence helpers ------------------------------------------ */
  /* v3: templates live INSIDE the editor JSON as `templateBlock` nodes,
   * so a draft is just the doc plus the version stamp. */
  const buildDraft = (editorJson: any) => ({
    version: 3,
    editor: editorJson,
  });

  /* --- autosave (debounced 2s) ------------------------------------- */
  const scheduleAutosave = (ed: Editor) => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      setDraftStatus('saving');
      try {
        localStorage.setItem(
          `draft_note_${patientId}`,
          JSON.stringify(buildDraft(ed.getJSON())),
        );
      } catch (e) {
        import('@sentry/react').then(({ captureException }) =>
          captureException(e, { tags: { context: 'autosave', patientId } }),
        );
      }
      window.setTimeout(() => {
        setDraftStatus('saved');
        setHeaderSaved(true);
      }, 450);
    }, 2000);
  };

  /* --- open the @-mention popover for a clicked chip --------------- */
  const openMentionPopover = (snapshot: MentionSnapshot | null, event: any) => {
    if (!snapshot) return;
    const chip = event.target.closest('.np-chip');
    const rect = chip
      ? chip.getBoundingClientRect()
      : { left: event.clientX, bottom: event.clientY };
    const left = Math.min(rect.left, window.innerWidth - 296);
    setMentionPopover({
      data: snapshot,
      top: rect.bottom + 6,
      left: Math.max(12, left),
    });
  };

  /* --- build the unified "/" item list ----------------------------- */
  function buildSlashItems(rawQuery: string): SlashItem[] {
    const { filter, term } = parseSlashQuery(rawQuery);

    const medItem = (group: string) => (m: MedicineDoseRow): SlashItem => ({
      id: `${group}:med:${m.medId}:${m.dose}`,
      kind: 'medicine',
      group,
      iconKey: 'medicine',
      title: m.name,
      dose: m.dose || '',
      description: [m.category, (m.dosageForms || []).join('/')]
        .filter(Boolean)
        .join(' · '),
      onSelect: ({ editor, range }: { editor: any; range: any }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent([
            {
              type: 'medicineChip',
              attrs: {
                medId: m.medId,
                name: m.name,
                dose: m.dose || '',
                category: m.category,
              },
            },
            { type: 'text', text: ' ' },
          ])
          .run();
        rememberMedicine(patientId, {
          medId: m.medId,
          name: m.name,
          dose: m.dose || '',
          category: m.category,
        } as MedicineDoseRow);
      },
    });

    const diagItem = (d: Diagnosis): SlashItem => ({
      id: `diag:${d.id}`,
      kind: 'diagnosis',
      group: 'Diagnoses',
      iconKey: 'diagnosis',
      title: d.name,
      description: [d.icd, d.category].filter(Boolean).join(' · '),
      onSelect: ({ editor, range }: { editor: any; range: any }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent([
            {
              type: 'diagnosisChip',
              attrs: {
                diagId: d.id,
                name: d.name,
                icd: d.icd,
                category: d.category,
              },
            },
            { type: 'text', text: ' ' },
          ])
          .run();
      },
    });

    const labItem = (t: LabTest): SlashItem => ({
      id: `lab:${t.id}`,
      kind: 'labtest',
      group: 'Lab tests',
      iconKey: 'labtest',
      title: t.name,
      description: [t.category, t.turnaround].filter(Boolean).join(' · '),
      onSelect: ({ editor, range }: { editor: any; range: any }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent([
            {
              type: 'labTestChip',
              attrs: {
                labId: t.id,
                name: t.name,
                category: t.category,
                turnaround: t.turnaround,
              },
            },
            { type: 'text', text: ' ' },
          ])
          .run();
      },
    });

    const actionItem = (a: (typeof QUICK_ACTIONS)[number]): SlashItem => ({
      id: `action:${a.id}`,
      kind: 'action',
      group: 'Quick actions',
      iconKey: a.iconKey,
      title: a.title,
      description: a.description,
      onSelect: ({ editor, range }: { editor: any; range: any }) => {
        const chain = editor.chain().focus().deleteRange(range);
        if (a.action === 'vitals')
          chain.insertContent(VITALS_TABLE_HTML + '<p></p>').run();
        else if (a.action === 'date')
          chain.insertContent(formatIndianDate()).run();
        else if (a.action === 'heading') chain.setHeading({ level: 2 }).run();
        else if (a.action === 'list') chain.toggleBulletList().run();
        else if (a.action === 'divider') chain.setHorizontalRule().run();
      },
    });

    const templateItem = (t: TemplateListItem): SlashItem => ({
      id: `tmpl:${t.id}`,
      kind: 'template',
      group: 'Templates',
      iconKey: t.description || 'template', // description = category (assessment/summary/…)
      title: t.title,
      description: t.description,
      onSelect: ({ editor, range }: { editor: any; range: any }) => {
        editor.chain().focus().deleteRange(range).run();
        applyTemplate(t);
      },
    });

    // Read fresh each call so AI-authored custom templates appear immediately.
    const allTemplates = getAllTemplates();

    /* empty query → templates + recently-used medicines + quick actions */
    if (!filter && !term) {
      return [
        ...allTemplates.map(templateItem),
        ...getRecentMedicines(patientId).map(medItem('Recent')),
        ...QUICK_ACTIONS.map(actionItem),
      ];
    }

    /* typed query → search clinical data directly, grouped by type */
    const items = [];
    const lc = term.toLowerCase();
    if (!filter || filter === 'template') {
      items.push(
        ...allTemplates
          .filter(
            (t) =>
              t.title.toLowerCase().includes(lc) ||
              String(t.description || '').toLowerCase().includes(lc) ||
              // custom templates carry a "/" shortcut keyword
              (t.template &&
                t.template.shortcut &&
                t.template.shortcut.includes(lc)),
          )
          .map(templateItem),
      );
    }
    if (!filter || filter === 'medicine') {
      items.push(...searchMedicineDoses(term).map(medItem('Medicines')));
    }
    if (!filter || filter === 'diagnosis') {
      items.push(...searchDiagnoses(term).map(diagItem));
    }
    if (!filter || filter === 'labtest') {
      items.push(...searchLabTests(term).map(labItem));
    }
    if (!filter) {
      items.push(
        ...QUICK_ACTIONS.filter(
          (a) =>
            a.title.toLowerCase().includes(lc) || a.id.includes(lc),
        ).map(actionItem),
      );
    }
    return items;
  }

  /* --- the editor -------------------------------------------------- */
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: PLACEHOLDER_TEXT }),
      Table.configure({
        resizable: false,
        HTMLAttributes: { class: 'np-vitals-table' },
      }),
      TableRow,
      TableHeader,
      TableCell,
      MedicineNode,
      DiagnosisNode,
      LabTestNode,
      TemplateNode,
      buildMentionExtension({
        items: ({ query }: { query: string }) => searchMentions(query),
        render: makeSuggestionRender(MentionList),
      }),
      SlashCommands.configure({
        items: ({ query }: { query: string }) => buildSlashItems(query),
        render: makeSuggestionRender(SlashCommandList),
      }),
      AiLoading,
      SaveShortcut.configure({
        onSave: () => handleSaveRef.current(),
      }),
    ],
    content: initialContent || '',
    editorProps: {
      handleClickOn: (view, pos, node, nodePos, event) => {
        if (node && node.type && node.type.name === 'mention') {
          openMentionPopover(node.attrs.snapshot, event);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      setHeaderSaved(false);
      setDraftStatus('idle');
      scheduleAutosave(ed);
      updateSelMenu(ed);
    },
    onSelectionUpdate: ({ editor: ed }) => updateSelMenu(ed),
  });

  /* --- floating AI button on text selection ------------------------ */
  const lastSelRef = useRef('');
  // True while the user is mid-drag selecting with the mouse. We keep the
  // bubble hidden until they release, so it doesn't flicker/follow the cursor
  // mid-selection — it only pops up once the selection is finished.
  const selectingRef = useRef(false);
  const updateSelMenu = (ed: Editor) => {
    const { from, to, empty } = ed.state.selection;
    if (empty) {
      setSelMenu(null);
      setSelAiOpen(false);
      lastSelRef.current = '';
      return;
    }
    const text = ed.state.doc.textBetween(from, to, ' ');
    if (!text.trim()) {
      setSelMenu(null);
      setSelAiOpen(false);
      lastSelRef.current = '';
      return;
    }
    // Still dragging the mouse — don't reveal the bubble yet.
    if (selectingRef.current) {
      setSelMenu(null);
      return;
    }
    try {
      // Anchor to where the selection ENDED (the focus/`to` end) so the bubble
      // appears right where the user let go, not floating over the middle.
      const head = ed.state.selection.head;
      const b = ed.view.coordsAtPos(head);
      setSelMenu({
        top: b.top,
        left: b.left,
      });
      // collapse the action menu only when the selection itself changes,
      // not on every spurious selection-update (e.g. clicking the AI button)
      const sig = `${from}:${to}`;
      if (sig !== lastSelRef.current) {
        setSelAiOpen(false);
        lastSelRef.current = sig;
      }
    } catch {
      setSelMenu(null);
    }
  };

  /* While the mouse is held down inside the editor, treat it as an in-progress
     selection: keep the bubble hidden. On release, reveal it (anchored to the
     selection end). A document-level mouseup catches releases outside too. */
  useEffect(() => {
    if (!editor) return undefined;
    const dom = editor.view.dom;
    const onDown = () => {
      selectingRef.current = true;
      setSelMenu(null);
    };
    const onUp = () => {
      if (!selectingRef.current) return;
      selectingRef.current = false;
      updateSelMenu(editor);
    };
    dom.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);
    return () => {
      dom.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  /* --- insert a template inline as a templateBlock node ------------ */
  const applyTemplate = (tplItem: TemplateListItem | Template) => {
    if (!editor) return;
    // tplItem may be the slash-menu wrapper { id, title, description, template }
    // OR the raw template object. Coalesce.
    const tpl = (tplItem as TemplateListItem).template || (tplItem as Template);
    // Signal the about-to-mount NodeView to auto-focus its first field (it
    // focuses in a layout effect once its DOM has committed).
    markTemplateInserted();
    editor
      .chain()
      .focus()
      .insertContent([
        { type: 'templateBlock', attrs: { templateId: tpl.id, values: {} } },
        { type: 'paragraph' },
      ])
      .run();
    setHeaderSaved(false);
    setDraftStatus('idle');
    scheduleAutosave(editor);
  };

  /* --- AI actions (polish, expand, summarize, explain) ------------- */
  const toParagraphs = (txt: string) =>
    txt.split('\n').map((line: string) => ({
      type: 'paragraph',
      content: line.trim() ? [{ type: 'text', text: line }] : [],
    }));

  /* The selection used to be sent to a separate result panel. Now the AI
     action transforms the text IN PLACE: the selected range blurs + shimmers
     while we call the model, then we swap the content inline. */
  const handleAi = async (actionId: string) => {
    if (!editor || aiBusy) return;
    const action = AI_ACTIONS.find((a) => a.id === actionId);
    if (!action) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) return; // bubble only appears on a selection, so this is rare
    const range = { from, to };
    const text = editor.state.doc.textBetween(from, to, '\n', leafTextForNode);
    if (!text.trim()) return;

    setSelMenu(null);
    setSelAiOpen(false);
    setAiError(null);
    setAiBusy(true);
    (editor.commands as any).setAiLoading(range);
    editor.setEditable(false);

    try {
      const result = await runAiAction(text, action.id as AiAction);
      editor.setEditable(true);
      (editor.commands as any).clearAiLoading();

      if (action.mode === 'append') {
        // Keep the original; add the AI result just after it, inline.
        editor
          .chain()
          .focus()
          .insertContentAt(range.to, [
            {
              type: 'heading',
              attrs: { level: 3 },
              content: [{ type: 'text', text: action.heading }],
            },
            ...toParagraphs(result),
          ])
          .run();
      } else {
        // Replace the selection with the transformed text, in place.
        editor.chain().focus().insertContentAt(range, result).run();
      }

      setHeaderSaved(false);
      setDraftStatus('idle');
      scheduleAutosave(editor);
    } catch (e: any) {
      editor.setEditable(true);
      (editor.commands as any).clearAiLoading();
      setAiError(e.message || 'The AI request failed. Please try again.');
      import('@sentry/react').then(({ captureException }) =>
        captureException(e, {
          tags: { context: 'ai', action: action.id, patientId },
        }),
      );
    } finally {
      setAiBusy(false);
    }
  };

  /* --- Feature: structured "Add Template" builder (P2-0) ----------- */

  const rowSeq = useRef(0);
  const newRow = (name = '', value = '', unit = ''): ParameterRow => ({
    id: `r${rowSeq.current++}`,
    name,
    value,
    unit,
  });

  /** Open the structured template modal, seeded with a starter parameter table
   *  (and any selected text as the description). */
  const openTemplateCreator = () => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    const sel = empty
      ? ''
      : editor.state.doc.textBetween(from, to, '\n', leafTextForNode);
    setSelMenu(null);
    setSelAiOpen(false);
    setAiError(null);
    setTmplModal({
      step: 'compose',
      description: sel.trim(),
      rows: [
        newRow('Blood Pressure', '', 'mmHg'),
        newRow('Heart Rate', '', 'bpm'),
        newRow('Weight', '', 'kg'),
      ],
      name: '',
      shortcut: '',
      category: 'assessment',
      accent: 'blue',
      generated: null,
      error: '',
    });
  };

  const patchModal = (patch: Partial<TmplModalState>) =>
    setTmplModal((m) => (m ? { ...m, ...patch } : m));

  const updateRow = (id: string, patch: Partial<ParameterRow>) =>
    setTmplModal((m) =>
      m
        ? { ...m, rows: m.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) }
        : m,
    );
  const addRow = () =>
    setTmplModal((m) => (m ? { ...m, rows: [...m.rows, newRow()] } : m));
  const removeRow = (id: string) =>
    setTmplModal((m) =>
      m ? { ...m, rows: m.rows.filter((r) => r.id !== id) } : m,
    );

  /** Generate the template: ask the AI to author it, falling back to the local
   *  deterministic builder if AI is unconfigured or returns something unusable. */
  const generateStructured = () => {
    if (!tmplModal) return;
    const m = tmplModal;
    // The name field was removed for simplicity — derive a friendly label from
    // the shortcut, else the first line of the description, else a fallback.
    const fromShortcut = m.shortcut
      .trim()
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const fromDescription = m.description
      .split('\n')
      .map((l) => l.trim())
      .find(Boolean)
      ?.slice(0, 48);
    const name =
      m.name.trim() || fromShortcut || fromDescription || 'Custom Template';
    const usable = m.rows.filter((r) => r.name.trim());
    if (!usable.length && !m.description.trim()) {
      patchModal({
        step: 'error',
        error: 'Add a description or at least one parameter row first.',
      });
      return;
    }
    const meta = {
      name,
      shortcut: m.shortcut,
      accent: m.accent,
      category: m.category,
    };
    patchModal({ step: 'generating', error: '' });

    // Apply a finished template only if the modal is still mid-generate.
    const applyTpl = (tpl: Template) =>
      setTmplModal((s) =>
        s && s.step === 'generating'
          ? { ...s, name, step: 'preview', generated: tpl }
          : s,
      );

    const fallback = () => {
      try {
        applyTpl(buildTemplateFromStructured(m.description, m.rows, meta));
      } catch (e: any) {
        setTmplModal((s) =>
          s && s.step === 'generating'
            ? { ...s, step: 'error', error: e?.message || 'Could not build the template.' }
            : s,
        );
      }
    };

    if (!isAiConfigured) {
      fallback();
      return;
    }

    const payload = JSON.stringify({
      description: m.description,
      parameters: m.rows.map((r) => ({
        name: r.name,
        value: r.value,
        unit: r.unit,
      })),
      name,
      category: m.category,
      accent: m.accent,
    });

    runAiAction(payload, 'template_structured')
      .then((out) => {
        try {
          applyTpl(assembleTemplateFromAi(out, meta));
        } catch {
          fallback(); // AI returned unusable JSON — build locally instead
        }
      })
      .catch(() => fallback()); // AI unreachable — build locally instead
  };

  const saveStructured = () => {
    if (!tmplModal || !tmplModal.generated) return;
    const tpl = tmplModal.generated;
    addCustomTemplate(tpl);
    forceTick((n) => n + 1);
    setTmplModal(null);
    setTmplSaved(
      tpl.shortcut
        ? `Template "${tpl.title}" saved · type /${tpl.shortcut} to insert`
        : `Template "${tpl.title}" saved · find it in the / menu`,
    );
  };

  const closeTemplateModal = () => setTmplModal(null);

  /* --- save -------------------------------------------------------- */
  const handleSave = () => {
    if (!editor) return;
    const draft = buildDraft(editor.getJSON());
    onSave?.(draft);
    try {
      localStorage.setItem(`draft_note_${patientId}`, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
    setHeaderSaved(true);
    setDraftStatus('saved');
  };
  handleSaveRef.current = handleSave;

  /* --- whole-note AI (topbar dropdown) ----------------------------- */
  /* Select the entire document, then reuse the same in-place AI flow the
     selection bubble uses, so "Polish/Summarize the whole note" just works. */
  const runWholeNoteAi = (actionId: AiAction) => {
    if (!editor || aiBusy) return;
    if (editor.isEmpty) {
      setAiError('Write some notes first, then run an AI action.');
      return;
    }
    editor.chain().focus().selectAll().run();
    handleAi(actionId);
  };

  /* --- new page: clear the canvas for a fresh note (P3-1) ----------- */
  const newPage = () => {
    if (!editor) return;
    editor.chain().focus().clearContent(true).run();
    try {
      localStorage.removeItem(`draft_note_${patientId}`);
    } catch {
      /* ignore */
    }
    setHeaderSaved(true);
    setDraftStatus('idle');
  };

  /* --- publish the imperative API to the shell --------------------- */
  /* Methods delegate through a ref so the published object stays stable while
     always invoking the latest closures. */
  const apiFnsRef = useRef({
    save: () => {},
    runWholeNoteAi: (_a: AiAction) => {},
    openTemplateCreator: () => {},
    newPage: () => {},
  });
  apiFnsRef.current = {
    save: handleSave,
    runWholeNoteAi,
    openTemplateCreator,
    newPage,
  };

  useEffect(() => {
    if (!editor || !onReady) return undefined;
    onReady({
      editor,
      save: () => apiFnsRef.current.save(),
      runWholeNoteAi: (a) => apiFnsRef.current.runWholeNoteAi(a),
      openTemplateCreator: () => apiFnsRef.current.openTemplateCreator(),
      newPage: () => apiFnsRef.current.newPage(),
      aiConfigured: isAiConfigured,
    });
    return () => onReady(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, onReady]);

  /* --- restore a draft on mount ------------------------------------ */
  useEffect(() => {
    if (!editor || initialContent) return;
    try {
      const raw = localStorage.getItem(`draft_note_${patientId}`);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 3) {
        // current format — templates live inside parsed.editor as nodes
        if (parsed.editor) editor.commands.setContent(parsed.editor);
      } else if (parsed && parsed.version === 2) {
        // v2 migration: convert separate templates[] into inline templateBlock
        // nodes prepended to the editor doc, so they stop being a side stack.
        const editorDoc = parsed.editor || { type: 'doc', content: [] };
        const templateNodes = (parsed.templates || [])
          .map((t: any) =>
            getTemplateById(t.templateId)
              ? {
                  type: 'templateBlock',
                  attrs: { templateId: t.templateId, values: t.values || {} },
                }
              : null,
          )
          .filter(Boolean);
        if (templateNodes.length) {
          editor.commands.setContent({
            ...editorDoc,
            content: [...templateNodes, ...(editorDoc.content || [])],
          });
        } else if (parsed.editor) {
          editor.commands.setContent(parsed.editor);
        }
      } else {
        // legacy: raw TipTap JSON
        editor.commands.setContent(parsed);
      }
      setRestored(true);
      setHeaderSaved(true);
      window.setTimeout(() => setRestored(false), 2600);
    } catch (e) {
      import('@sentry/react').then(({ captureException }) =>
        captureException(e, { tags: { context: 'draft-restore', patientId } }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  /* --- cleanup ----------------------------------------------------- */
  useEffect(
    () => () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    },
    [],
  );

  /* Re-render when a custom template is added elsewhere so the "/" menu and
     counts stay in sync. */
  useEffect(
    () => subscribeCustomTemplates(() => forceTick((n) => n + 1)),
    [],
  );

  /* Auto-dismiss the transient AI error toast. */
  useEffect(() => {
    if (!aiError) return undefined;
    const t = setTimeout(() => setAiError(null), 5000);
    return () => clearTimeout(t);
  }, [aiError]);

  /* Auto-dismiss the "template saved" confirmation. */
  useEffect(() => {
    if (!tmplSaved) return undefined;
    const t = setTimeout(() => setTmplSaved(null), 4200);
    return () => clearTimeout(t);
  }, [tmplSaved]);


  const { words, lines } = getCounts(editor);

  /* Count templateBlock nodes for the status-bar suffix. */
  let templateCount = 0;
  if (editor) {
    editor.state.doc.descendants((n) => {
      if (n.type.name === 'templateBlock') templateCount += 1;
    });
  }

  /* --- status-bar draft indicator ---------------------------------- */
  let draftEl = null;
  if (restored) {
    draftEl = (
      <span className="np-statusbar__draft is-saved">
        <IconCheck size={11} />
        Draft restored
      </span>
    );
  } else if (draftStatus === 'saving') {
    draftEl = (
      <span className="np-statusbar__draft is-saving">
        <IconSpinner size={12} />
        Saving…
      </span>
    );
  } else if (draftStatus === 'saved') {
    draftEl = (
      <span className="np-statusbar__draft is-saved">
        <IconCheck size={11} />
        Draft saved
      </span>
    );
  } else {
    draftEl = <span className="np-statusbar__draft is-idle">Draft saved</span>;
  }

  return (
    <div className="doctor-notepad">
      {/* Template creation lives in the selection bubble menu (the "+" button)
          and pre-built templates are insertable via the slash menu. The
          persistent top toolbar was removed per request. */}

      {/* EDITOR — templates live inline as `templateBlock` nodes inside it,
          so prose and templates share one continuous notepad surface. */}
      <div className="np-editor-area">
        <EditorContent editor={editor} />
      </div>

      {/* ZONE 3b — STATUS BAR */}
      <div className="np-statusbar">
        <span className="np-statusbar__count">
          {words} {words === 1 ? 'word' : 'words'} · {lines}{' '}
          {lines === 1 ? 'line' : 'lines'}
          {templateCount > 0 &&
            ` · ${templateCount} ${templateCount === 1 ? 'template' : 'templates'}`}
        </span>
        {draftEl}
      </div>


      {/* SELECTION BUBBLE — formatting + AI, appears above a text selection.
          Portaled to <body> so the scroll container can't clip it (P2b-4). */}
      {selMenu && !aiBusy && !tmplModal && editor &&
        createPortal(
        <div
          className="np-sel-ai"
          style={{ top: selMenu.top, left: selMenu.left }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="np-sel-bar">
            <button
              type="button"
              className={`np-sel-fmt${editor.isActive('bold') ? ' is-active' : ''}`}
              title="Bold"
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              className={`np-sel-fmt${editor.isActive('italic') ? ' is-active' : ''}`}
              title="Italic"
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <em>I</em>
            </button>
            <button
              type="button"
              className={`np-sel-fmt${editor.isActive('underline') ? ' is-active' : ''}`}
              title="Underline"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <u>U</u>
            </button>
            <button
              type="button"
              className={`np-sel-fmt${editor.isActive('strike') ? ' is-active' : ''}`}
              title="Strikethrough"
              onClick={() => editor.chain().focus().toggleStrike().run()}
            >
              <s>S</s>
            </button>
            <span className="np-sel-bar__div" />
            <button
              type="button"
              className={`np-sel-fmt${editor.isActive('bulletList') ? ' is-active' : ''}`}
              title="Bullet list"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              ☰
            </button>
            <button
              type="button"
              className={`np-sel-fmt${editor.isActive('heading', { level: 2 }) ? ' is-active' : ''}`}
              title="Heading"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              H
            </button>
            <span className="np-sel-bar__div" />
            <button
              type="button"
              className="np-sel-fmt np-sel-create"
              title="Create a template from this selection"
              onClick={openTemplateCreator}
            >
              <IconPlus size={14} />
            </button>
            <button
              type="button"
              className={`np-sel-ai__btn${selAiOpen ? ' is-open' : ''}`}
              onClick={() => setSelAiOpen((v) => !v)}
            >
              <IconSparkles size={13} />
              AI
            </button>
          </div>
          {selAiOpen && (
            <div className="np-sel-ai__menu">
              {AI_ACTIONS.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  className="np-sel-ai__action"
                  onClick={() => handleAi(a.id)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body,
      )}

      {/* FLOATING LAYERS */}
      {mentionPopover &&
        createPortal(
        <>
          <div
            className="np-overlay"
            onMouseDown={() => setMentionPopover(null)}
          />
          <div
            className="np-floating"
            style={{ top: mentionPopover.top, left: mentionPopover.left }}
          >
            <MentionPopover data={mentionPopover.data} />
          </div>
        </>,
        document.body,
      )}

      {/* AI working indicator — floats while the inline transform runs */}
      {aiBusy &&
        createPortal(
        <div className="np-ai-working" role="status">
          <IconSpinner size={14} />
          AI is rewriting your selection…
        </div>,
        document.body,
      )}

      {/* Transient error toast (AI failures, empty-selection hints) */}
      {aiError &&
        createPortal(
        <div className="np-ai-toast np-ai-toast--err" role="alert">
          <span>{aiError}</span>
          <button
            type="button"
            className="np-ai-toast__x"
            aria-label="Dismiss"
            onClick={() => setAiError(null)}
          >
            <IconClose size={13} />
          </button>
        </div>,
        document.body,
      )}

      {/* "Template saved" confirmation toast */}
      {tmplSaved &&
        createPortal(
        <div className="np-ai-toast np-ai-toast--ok" role="status">
          <IconCheck size={13} />
          <span>{tmplSaved}</span>
        </div>,
        document.body,
      )}

      {/* STRUCTURED "ADD TEMPLATE" MODAL (P2-0) — portaled to <body> */}
      {tmplModal &&
        createPortal(
          <>
            <div className="np-overlay" onMouseDown={closeTemplateModal} />
            <div
              className="np-tmpl-modal np-tmpl-modal--wide"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="np-tmpl-modal__head">
                <span className="np-tmpl-modal__title">
                  <IconTemplatePlus size={16} />
                  Add Template
                </span>
                <button
                  type="button"
                  className="np-tmpl-modal__x"
                  aria-label="Close"
                  onClick={closeTemplateModal}
                >
                  <IconClose size={15} />
                </button>
              </div>

              {/* STEP 1 — COMPOSE */}
              {tmplModal.step === 'compose' && (
                <div className="np-tmpl-modal__body">
                  <label className="np-tmpl-field">
                    <span className="np-tmpl-field__label">Description</span>
                    <textarea
                      className="np-tmpl-desc"
                      placeholder="What is this template for? e.g. Pre-dialysis check for vitals and access site."
                      value={tmplModal.description}
                      spellCheck={false}
                      onChange={(e) => patchModal({ description: e.target.value })}
                    />
                  </label>

                  <div className="np-tmpl-table__head">
                    <span className="np-tmpl-field__label">Parameters</span>
                    <button
                      type="button"
                      className="np-tmpl-addrow"
                      onClick={addRow}
                    >
                      <IconPlus size={13} /> Add row
                    </button>
                  </div>

                  <table className="np-tmpl-table">
                    <thead>
                      <tr>
                        <th>Parameter</th>
                        <th>Value / options</th>
                        <th>Unit</th>
                        <th aria-label="Remove" />
                      </tr>
                    </thead>
                    <tbody>
                      {tmplModal.rows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <input
                              type="text"
                              placeholder="Blood Pressure"
                              value={row.name}
                              onChange={(e) =>
                                updateRow(row.id, { name: e.target.value })
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="AVF, AVG, Catheter"
                              value={row.value}
                              onChange={(e) =>
                                updateRow(row.id, { value: e.target.value })
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              placeholder="mmHg / (select)"
                              value={row.unit}
                              onChange={(e) =>
                                updateRow(row.id, { unit: e.target.value })
                              }
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="np-tmpl-delrow"
                              aria-label="Remove row"
                              onClick={() => removeRow(row.id)}
                            >
                              <IconClose size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="np-tmpl-hint">
                    Field types are inferred from the unit: <code>mmHg</code> → BP,
                    <code>bpm</code>/<code>%</code> → number boxes, <code>kg</code> →
                    decimal, add <code>(select)</code> / <code>(multi)</code> for
                    option lists.
                  </p>

                  <div className="np-tmpl-modal__fields">
                    <label className="np-tmpl-field">
                      <span className="np-tmpl-field__label">
                        Shortcut to insert{' '}
                        <span className="np-tmpl-field__opt">(optional)</span>
                      </span>
                      <div className="np-tmpl-field__shortcut">
                        <span className="np-tmpl-field__slash">/</span>
                        <input
                          type="text"
                          className="np-tmpl-field__input"
                          placeholder="predialysis"
                          value={tmplModal.shortcut}
                          onChange={(e) =>
                            patchModal({
                              shortcut: e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9]/g, ''),
                            })
                          }
                        />
                      </div>
                    </label>
                  </div>

                  <div className="np-tmpl-modal__actions">
                    <button
                      type="button"
                      className="np-btn-cancel"
                      onClick={closeTemplateModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="np-btn-save"
                      onClick={generateStructured}
                    >
                      <IconSparkles size={13} />
                      Generate
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 — GENERATING */}
              {tmplModal.step === 'generating' && (
                <div className="np-tmpl-modal__loading">
                  <IconSpinner size={18} />
                  <span>Building your template…</span>
                </div>
              )}

              {/* ERROR */}
              {tmplModal.step === 'error' && (
                <div className="np-tmpl-modal__body">
                  <div className="np-tmpl-modal__error">
                    {tmplModal.error || 'Could not build a template.'}
                  </div>
                  <div className="np-tmpl-modal__actions">
                    <button
                      type="button"
                      className="np-btn-cancel"
                      onClick={closeTemplateModal}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="np-btn-save"
                      onClick={() => patchModal({ step: 'compose', error: '' })}
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3 — PREVIEW */}
              {tmplModal.step === 'preview' && tmplModal.generated && (
                <div className="np-tmpl-modal__body">
                  <p className="np-tmpl-hint">
                    Preview of the generated template (fields are empty — ready to
                    fill once inserted).
                  </p>
                  <div className="np-tmpl-preview-pane">
                    <ProseTemplateCard
                      template={tmplModal.generated}
                      values={{}}
                      onChange={() => {}}
                      onRemove={() => {}}
                    />
                  </div>
                  <div className="np-tmpl-modal__actions">
                    <button
                      type="button"
                      className="np-btn-cancel"
                      onClick={() => patchModal({ step: 'compose' })}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="np-btn-save"
                      onClick={saveStructured}
                    >
                      <IconCheck size={13} />
                      Save template
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
