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
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
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

import { MedicineNode } from './nodes/MedicineNode';
import { DiagnosisNode } from './nodes/DiagnosisNode';
import { LabTestNode } from './nodes/LabTestNode';
import { SlashCommands } from './extensions/SlashCommands';
import { buildMentionExtension } from './extensions/MentionChip';
import { makeSuggestionRender } from './extensions/suggestionRender';
import {
  searchMentions,
  searchMedicineDoses,
  searchDiagnoses,
  searchLabTests,
  getAllTemplates,
} from '../../data/db.helpers';
import { getTemplateById } from '../../data/templates';

import SlashCommandList from './SlashCommandList';
import MentionList from './MentionList';
import MentionPopover from './MentionPopover';
import TemplateStack from './templates/TemplateStack';
import { toText as templateToText } from './templates/templateSerializer';
import {
  IconCheck,
  IconSpinner,
  IconSparkles,
} from './icons';
import { formatIndianDate } from './utils';
import { runAiAction } from './aiActions';
import './styles/notepad.css';

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

/* Note templates — applied from the header dropdown, not the "/" menu. */
const TEMPLATES = getAllTemplates();

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
const FILTER_KEYWORDS = {
  medicine: 'medicine', medicines: 'medicine', med: 'medicine', meds: 'medicine', rx: 'medicine',
  diagnosis: 'diagnosis', diagnoses: 'diagnosis', diag: 'diagnosis', dx: 'diagnosis',
  lab: 'labtest', labs: 'labtest', labtest: 'labtest', test: 'labtest', tests: 'labtest',
  template: 'template', templates: 'template', tmpl: 'template', form: 'template',
};

/** Split a "/" query into an optional type filter and the search term. */
function parseSlashQuery(raw) {
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
const recentKey = (pid) => `recent_medicines_${pid}`;

function getRecentMedicines(pid) {
  try {
    const list = JSON.parse(localStorage.getItem(recentKey(pid)) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function rememberMedicine(pid, med) {
  try {
    const sig = (m) => `${m.medId}|${m.dose}`;
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
function leafTextForNode(node) {
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
function getCounts(editor) {
  if (!editor) return { words: 0, lines: 0 };
  const text = editor.getText({ blockSeparator: '\n' });
  const words = (text.match(/\S+/g) || []).length;
  const lines = text.length ? text.split('\n').length : 1;
  return { words, lines };
}

export default function DoctorNotePad({
  patientId = 'pat001',
  initialContent = null,
  onSave,
  onCancel,
}) {
  const [headerSaved, setHeaderSaved] = useState(true);
  const [draftStatus, setDraftStatus] = useState('idle'); // idle | saving | saved
  const [restored, setRestored] = useState(false);
  const [mentionPopover, setMentionPopover] = useState(null); // { data, top, left }
  // { whole, range:{from,to}, original, status:'loading'|'done'|'error', suggestion, error }
  const [aiPopup, setAiPopup] = useState(null);
  const [selMenu, setSelMenu] = useState(null); // { top, left } for selection AI button
  const [selAiOpen, setSelAiOpen] = useState(false);
  /* Applied template instances: { instanceId, template, values, collapsed } */
  const [templates, setTemplates] = useState([]);
  const [lastAddedTemplateId, setLastAddedTemplateId] = useState(null);
  const instanceIdRef = useRef(0);

  const autosaveTimer = useRef(null);
  const handleSaveRef = useRef(() => {});
  const templatesRef = useRef(templates);
  templatesRef.current = templates;

  /* --- persistence helpers ------------------------------------------ */
  const buildDraft = (editorJson) => ({
    version: 2,
    editor: editorJson,
    templates: templatesRef.current.map((inst) => ({
      instanceId: inst.instanceId,
      templateId: inst.template.id,
      values: inst.values,
      collapsed: inst.collapsed,
    })),
  });

  /* --- autosave (debounced 2s) ------------------------------------- */
  const scheduleAutosave = (ed) => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
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
  const openMentionPopover = (snapshot, event) => {
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
  function buildSlashItems(rawQuery) {
    const { filter, term } = parseSlashQuery(rawQuery);

    const medItem = (group) => (m) => ({
      id: `${group}:med:${m.medId}:${m.dose}`,
      kind: 'medicine',
      group,
      iconKey: 'medicine',
      title: m.name,
      dose: m.dose || '',
      description: [m.category, (m.dosageForms || []).join('/')]
        .filter(Boolean)
        .join(' · '),
      onSelect: ({ editor, range }) => {
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
        });
      },
    });

    const diagItem = (d) => ({
      id: `diag:${d.id}`,
      kind: 'diagnosis',
      group: 'Diagnoses',
      iconKey: 'diagnosis',
      title: d.name,
      description: [d.icd, d.category].filter(Boolean).join(' · '),
      onSelect: ({ editor, range }) => {
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

    const labItem = (t) => ({
      id: `lab:${t.id}`,
      kind: 'labtest',
      group: 'Lab tests',
      iconKey: 'labtest',
      title: t.name,
      description: [t.category, t.turnaround].filter(Boolean).join(' · '),
      onSelect: ({ editor, range }) => {
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

    const actionItem = (a) => ({
      id: `action:${a.id}`,
      kind: 'action',
      group: 'Quick actions',
      iconKey: a.iconKey,
      title: a.title,
      description: a.description,
      onSelect: ({ editor, range }) => {
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

    const templateItem = (t) => ({
      id: `tmpl:${t.id}`,
      kind: 'template',
      group: 'Templates',
      iconKey: t.description || 'template', // description = category (assessment/summary/…)
      title: t.title,
      description: t.description,
      onSelect: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        applyTemplate(t);
      },
    });

    /* empty query → templates + recently-used medicines + quick actions */
    if (!filter && !term) {
      return [
        ...TEMPLATES.map(templateItem),
        ...getRecentMedicines(patientId).map(medItem('Recent')),
        ...QUICK_ACTIONS.map(actionItem),
      ];
    }

    /* typed query → search clinical data directly, grouped by type */
    const items = [];
    const lc = term.toLowerCase();
    if (!filter || filter === 'template') {
      items.push(
        ...TEMPLATES.filter(
          (t) =>
            t.title.toLowerCase().includes(lc) ||
            String(t.description || '').toLowerCase().includes(lc),
        ).map(templateItem),
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
      buildMentionExtension({
        items: ({ query }) => searchMentions(query),
        render: makeSuggestionRender(MentionList),
      }),
      SlashCommands.configure({
        items: ({ query }) => buildSlashItems(query),
        render: makeSuggestionRender(SlashCommandList),
      }),
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
  const updateSelMenu = (ed) => {
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
    try {
      const a = ed.view.coordsAtPos(from);
      const b = ed.view.coordsAtPos(to);
      setSelMenu({
        top: Math.min(a.top, b.top),
        left: (a.left + b.left) / 2,
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

  /* --- add a structured template instance to the stack ------------- */
  const applyTemplate = (tplItem) => {
    // tplItem from getAllTemplates() => { id, title, description, template }
    const tpl = tplItem.template || tplItem;
    instanceIdRef.current += 1;
    const newInstanceId = `tpl-${instanceIdRef.current}-${tpl.id}`;
    setTemplates((prev) => [
      ...prev.map((p) => ({ ...p, collapsed: true })),
      { instanceId: newInstanceId, template: tpl, values: {}, collapsed: false },
    ]);
    setLastAddedTemplateId(newInstanceId);
    setHeaderSaved(false);
    setDraftStatus('idle');
    if (editor) scheduleAutosave(editor);
  };

  const updateInstance = (instanceId, patch) => {
    setTemplates((prev) =>
      prev.map((p) => {
        if (p.instanceId !== instanceId) return p;
        const next = { ...p, ...patch };
        // merge field values rather than replacing, so partial updates
        // (one field at a time) never drop other fields
        if (patch.values) next.values = { ...p.values, ...patch.values };
        return next;
      }),
    );
    setHeaderSaved(false);
    setDraftStatus('idle');
    if (editor) scheduleAutosave(editor);
  };

  const toggleCollapseInstance = (instanceId) => {
    setTemplates((prev) =>
      prev.map((p) => {
        if (p.instanceId === instanceId) return { ...p, collapsed: !p.collapsed };
        // collapse others when expanding one
        const target = prev.find((q) => q.instanceId === instanceId);
        if (target && target.collapsed) return { ...p, collapsed: true };
        return p;
      }),
    );
    setLastAddedTemplateId(instanceId);
  };

  const removeInstance = (instanceId) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('Remove this template from the note?')) return;
    setTemplates((prev) => prev.filter((p) => p.instanceId !== instanceId));
    setHeaderSaved(false);
    setDraftStatus('idle');
    if (editor) scheduleAutosave(editor);
  };

  /* --- AI actions (polish, expand, summarize, explain) ------------- */
  const toParagraphs = (txt) =>
    txt.split('\n').map((line) => ({
      type: 'paragraph',
      content: line.trim() ? [{ type: 'text', text: line }] : [],
    }));

  const startAi = async (action, payload) => {
    setSelMenu(null);
    setSelAiOpen(false);
    setAiPopup({
      action,
      whole: payload.whole,
      range: payload.range,
      original: payload.text,
      status: 'loading',
      suggestion: '',
      error: '',
    });
    try {
      const suggestion = await runAiAction(payload.text, action.id);
      setAiPopup((p) =>
        p && p.status === 'loading' ? { ...p, status: 'done', suggestion } : p,
      );
    } catch (e) {
      setAiPopup((p) =>
        p && p.status === 'loading'
          ? { ...p, status: 'error', error: e.message }
          : p,
      );
      import('@sentry/react').then(({ captureException }) =>
        captureException(e, {
          tags: { context: 'ai', action: action.id, patientId },
        }),
      );
    }
  };

  /** Serialized text of all filled template cards (prepended for whole-note AI). */
  const templatesText = () =>
    templates
      .map((inst) => templateToText(inst.template, inst.values))
      .join('\n\n');

  const handleAi = (actionId) => {
    if (!editor || aiPopup?.status === 'loading') return;
    const action = AI_ACTIONS.find((a) => a.id === actionId);
    if (!action) return;
    const { from, to, empty } = editor.state.selection;
    const payload = empty
      ? {
          whole: true,
          range: { from: 0, to: editor.state.doc.content.size },
          text: [templatesText(), editor.getText({ blockSeparator: '\n' })]
            .filter((s) => s.trim())
            .join('\n\n'),
        }
      : {
          whole: false,
          range: { from, to },
          text: editor.state.doc.textBetween(from, to, '\n', leafTextForNode),
        };
    if (!payload.text.trim()) return;
    startAi(action, payload);
  };

  const retryAi = () => {
    if (aiPopup) {
      startAi(aiPopup.action, {
        whole: aiPopup.whole,
        range: aiPopup.range,
        text: aiPopup.original,
      });
    }
  };

  const acceptAi = () => {
    if (!editor || !aiPopup || aiPopup.status !== 'done') return;
    const { action, whole, range, suggestion } = aiPopup;
    if (action.mode === 'append') {
      const endPos = editor.state.doc.content.size;
      editor
        .chain()
        .focus()
        .insertContentAt(endPos, [
          { type: 'horizontalRule' },
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: action.heading }],
          },
          ...toParagraphs(suggestion),
        ])
        .run();
    } else if (whole) {
      editor
        .chain()
        .focus()
        .setContent({ type: 'doc', content: toParagraphs(suggestion) })
        .run();
    } else {
      editor.chain().focus().insertContentAt(range, suggestion).run();
    }
    setAiPopup(null);
  };

  const rejectAi = () => setAiPopup(null);

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

  /* --- restore a draft on mount ------------------------------------ */
  useEffect(() => {
    if (!editor || initialContent) return;
    try {
      const raw = localStorage.getItem(`draft_note_${patientId}`);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 2) {
        if (parsed.editor) editor.commands.setContent(parsed.editor);
        const restoredInstances = (parsed.templates || [])
          .map((t) => {
            const template = getTemplateById(t.templateId);
            if (!template) return null;
            return {
              instanceId: t.instanceId,
              template,
              values: t.values || {},
              collapsed: t.collapsed !== false, // restore collapsed by default
            };
          })
          .filter(Boolean);
        if (restoredInstances.length) {
          // keep instanceIdRef ahead of the highest restored id ("tpl-<n>-...")
          instanceIdRef.current = Math.max(
            0,
            ...restoredInstances.map(
              (i) => parseInt(String(i.instanceId).split('-')[1], 10) || 0,
            ),
          );
          setTemplates(restoredInstances);
        }
      } else {
        // legacy draft: raw TipTap JSON
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


  const { words, lines } = getCounts(editor);

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
      {/* TEMPLATE CARDS + FREE EDITOR */}
      <div className="np-editor-area">
        <TemplateStack
          instances={templates}
          onUpdate={updateInstance}
          onRemove={removeInstance}
          onToggleCollapse={toggleCollapseInstance}
          lastAddedId={lastAddedTemplateId}
        />
        {templates.length > 0 && (
          <div className="np-free-notes-divider">free notes</div>
        )}
        <EditorContent editor={editor} />
      </div>

      {/* ZONE 3b — STATUS BAR */}
      <div className="np-statusbar">
        <span className="np-statusbar__count">
          {words} {words === 1 ? 'word' : 'words'} · {lines}{' '}
          {lines === 1 ? 'line' : 'lines'}
          {templates.length > 0 &&
            ` · ${templates.length} ${templates.length === 1 ? 'template' : 'templates'}`}
        </span>
        {draftEl}
      </div>


      {/* SELECTION BUBBLE — formatting + AI, appears above a text selection */}
      {selMenu && !aiPopup && editor && (
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
        </div>
      )}

      {/* FLOATING LAYERS */}
      {mentionPopover && (
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
        </>
      )}

      {aiPopup && (
        <>
          <div className="np-overlay" onMouseDown={rejectAi} />
          <div
            className="np-ai-popup"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="np-ai-popup__title">
              <IconSparkles size={13} />
              {aiPopup.action.label}
            </div>

            {aiPopup.status === 'loading' && (
              <div className="np-ai-popup__loading">
                <IconSpinner size={15} />
                Working on it…
              </div>
            )}
            {aiPopup.status === 'error' && (
              <div className="np-ai-popup__error">{aiPopup.error}</div>
            )}
            {aiPopup.status === 'done' && (
              <div className="np-ai-popup__text">{aiPopup.suggestion}</div>
            )}

            <div className="np-ai-popup__actions">
              {aiPopup.status === 'loading' && (
                <button
                  type="button"
                  className="np-btn-cancel"
                  onClick={rejectAi}
                >
                  Cancel
                </button>
              )}
              {aiPopup.status === 'error' && (
                <>
                  <button
                    type="button"
                    className="np-btn-cancel"
                    onClick={rejectAi}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="np-btn-save"
                    onClick={retryAi}
                  >
                    Retry
                  </button>
                </>
              )}
              {aiPopup.status === 'done' && (
                <>
                  <button
                    type="button"
                    className="np-btn-cancel"
                    onClick={rejectAi}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="np-btn-save"
                    onClick={acceptAi}
                  >
                    <IconCheck size={13} />
                    {aiPopup.action.mode === 'append'
                      ? 'Add to note'
                      : 'Accept'}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
