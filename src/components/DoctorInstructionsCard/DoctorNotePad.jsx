/**
 * DoctorNotePad.jsx
 * -------------------------------------------------------------------------
 * The Doctor's Notepad — a fully featured TipTap rich-text editor.
 *
 * Features: formatting toolbar, 10 slash commands (/), @ mentions of
 * patients & doctors, medicine/diagnosis/lab-test chips, an editable vitals
 * table, click-to-open mention popovers, autosave drafts, word count.
 * The note is stored ONLY as TipTap JSON.
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
import { searchMentions } from '../../data/db.helpers';

import Toolbar from './Toolbar';
import SlashCommandList from './SlashCommandList';
import MentionList from './MentionList';
import CommandPicker from './CommandPicker';
import MentionPopover from './MentionPopover';
import {
  IconPencil,
  IconMaximize,
  IconMinimize,
  IconMoreVertical,
  IconSave,
  IconCheck,
  IconSpinner,
  IconKeyboard,
} from './icons';
import { formatIndianDate } from './utils';
import './styles/notepad.css';

const PLACEHOLDER_TEXT =
  'Start typing, or press / for commands, @ to mention a patient or doctor...';

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

/* The 10 slash commands. */
const SLASH_COMMANDS = [
  { id: 'medicine', title: 'Medicine', description: 'Insert a medicine as a chip', iconKey: 'medicine', picker: 'medicine' },
  { id: 'diagnosis', title: 'Diagnosis', description: 'Insert a diagnosis as a chip', iconKey: 'diagnosis', picker: 'diagnosis' },
  { id: 'labtest', title: 'Lab Test', description: 'Insert a lab test as a chip', iconKey: 'labtest', picker: 'labtest' },
  { id: 'template', title: 'Template', description: 'Apply a saved note template', iconKey: 'template', picker: 'template' },
  { id: 'dosage', title: 'Dosage', description: 'Build a medication instruction', iconKey: 'dosage', picker: 'dosage' },
  { id: 'vitals', title: 'Vitals Table', description: 'Insert an editable vitals table', iconKey: 'vitals', action: 'vitals' },
  { id: 'date', title: 'Date', description: "Insert today's date", iconKey: 'date', action: 'date' },
  { id: 'heading', title: 'Heading', description: 'Make this line a heading', iconKey: 'heading', action: 'heading' },
  { id: 'list', title: 'Bullet List', description: 'Start a bullet list', iconKey: 'list', action: 'list' },
  { id: 'divider', title: 'Divider', description: 'Insert a horizontal line', iconKey: 'divider', action: 'divider' },
];

/** Build the filtered slash-command list; each gets an onSelect closure. */
function buildSlashCommands(query, openPicker) {
  const q = (query || '').toLowerCase().trim();
  return SLASH_COMMANDS.filter(
    (c) => !q || c.title.toLowerCase().includes(q) || c.id.includes(q),
  ).map((c) => ({
    ...c,
    onSelect: ({ editor, range }) => {
      if (c.picker) {
        editor.chain().focus().deleteRange(range).run();
        openPicker(c.picker, editor);
        return;
      }
      const chain = editor.chain().focus().deleteRange(range);
      if (c.action === 'vitals') chain.insertContent(VITALS_TABLE_HTML + '<p></p>').run();
      else if (c.action === 'date') chain.insertContent(formatIndianDate()).run();
      else if (c.action === 'heading') chain.setHeading({ level: 2 }).run();
      else if (c.action === 'list') chain.toggleBulletList().run();
      else if (c.action === 'divider') chain.setHorizontalRule().run();
    },
  }));
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

const SHORTCUTS = [
  { label: 'Bold', keys: 'Ctrl B' },
  { label: 'Italic', keys: 'Ctrl I' },
  { label: 'Underline', keys: 'Ctrl U' },
  { label: 'Undo', keys: 'Ctrl Z' },
  { label: 'Redo', keys: 'Ctrl Y' },
  { label: 'Save note', keys: 'Ctrl S' },
  { label: 'Open commands', keys: '/' },
  { label: 'Mention someone', keys: '@' },
];

export default function DoctorNotePad({
  patientId = 'pat001',
  initialContent = null,
  onSave,
  onCancel,
}) {
  const [headerSaved, setHeaderSaved] = useState(true);
  const [draftStatus, setDraftStatus] = useState('idle'); // idle | saving | saved
  const [restored, setRestored] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [picker, setPicker] = useState(null); // { type, top, left }
  const [mentionPopover, setMentionPopover] = useState(null); // { data, top, left }
  const [moreMenu, setMoreMenu] = useState(null); // { top, left }

  const autosaveTimer = useRef(null);
  const handleSaveRef = useRef(() => {});
  const moreBtnRef = useRef(null);

  /* --- autosave (debounced 2s) ------------------------------------- */
  const scheduleAutosave = (ed) => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      setDraftStatus('saving');
      try {
        localStorage.setItem(
          `draft_note_${patientId}`,
          JSON.stringify(ed.getJSON()),
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
        items: ({ query }) => buildSlashCommands(query, openPickerStable),
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
    },
  });

  /* --- open a second-level picker at the caret --------------------- */
  function openPickerStable(type, ed) {
    const from = ed.state.selection.from;
    let coords;
    try {
      coords = ed.view.coordsAtPos(from);
    } catch {
      coords = { left: 80, bottom: 200 };
    }
    const left = Math.min(coords.left, window.innerWidth - 284);
    setPicker({
      type,
      top: coords.bottom + 6,
      left: Math.max(12, left),
    });
  }

  const closePicker = () => {
    setPicker(null);
    editor?.commands.focus();
  };

  /* --- apply a template (replaces the whole document) -------------- */
  const applyTemplate = (tpl) => {
    if (!editor) return;
    if (!editor.isEmpty) {
      // eslint-disable-next-line no-alert
      if (!window.confirm('Replace the current note with this template?')) return;
    }
    const lines = String(tpl.content || '').split('\n');
    const content = lines.map((line) => ({
      type: 'paragraph',
      content: line.trim() ? [{ type: 'text', text: line }] : [],
    }));
    editor.chain().focus().setContent({ type: 'doc', content }).run();
  };

  /* --- handle a result chosen in the second-level picker ----------- */
  const handlePickerResult = (payload) => {
    if (!editor) return;
    if (payload.kind === 'medicine') {
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: 'medicineChip',
            attrs: {
              medId: payload.medId,
              name: payload.name,
              dose: payload.dose,
              category: payload.category,
            },
          },
          { type: 'text', text: ' ' },
        ])
        .run();
    } else if (payload.kind === 'diagnosis') {
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: 'diagnosisChip',
            attrs: {
              diagId: payload.diagId,
              name: payload.name,
              icd: payload.icd,
              category: payload.category,
            },
          },
          { type: 'text', text: ' ' },
        ])
        .run();
    } else if (payload.kind === 'labtest') {
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: 'labTestChip',
            attrs: {
              labId: payload.labId,
              name: payload.name,
              category: payload.category,
              turnaround: payload.turnaround,
            },
          },
          { type: 'text', text: ' ' },
        ])
        .run();
    } else if (payload.kind === 'template') {
      applyTemplate(payload.template);
    } else if (payload.kind === 'dosage') {
      editor
        .chain()
        .focus()
        .insertContent([
          { type: 'text', marks: [{ type: 'bold' }], text: payload.text },
          { type: 'text', text: payload.sig ? ` — ${payload.sig}` : '' },
        ])
        .run();
    }
    setPicker(null);
  };

  /* --- save -------------------------------------------------------- */
  const handleSave = () => {
    if (!editor) return;
    const json = editor.getJSON();
    onSave?.(json);
    try {
      localStorage.setItem(`draft_note_${patientId}`, JSON.stringify(json));
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
      if (raw) {
        editor.commands.setContent(JSON.parse(raw));
        setRestored(true);
        setHeaderSaved(true);
        window.setTimeout(() => setRestored(false), 2600);
      }
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

  const openMoreMenu = () => {
    if (moreMenu) {
      setMoreMenu(null);
      return;
    }
    const r = moreBtnRef.current?.getBoundingClientRect();
    if (r) setMoreMenu({ top: r.bottom + 6, left: r.right - 230 });
  };

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
    <div className={`doctor-notepad${isFullscreen ? ' is-fullscreen' : ''}`}>
      {/* ZONE 1 — HEADER */}
      <header className="np-header">
        <div className="np-header__left">
          <span className="np-header__icon">
            <IconPencil size={16} />
          </span>
          <span className="np-header__title">Doctor&apos;s Instructions</span>
          <span
            className={`np-status-pill ${
              headerSaved ? 'is-saved' : 'is-unsaved'
            }`}
          >
            {headerSaved ? '✓ Draft saved' : '● Unsaved'}
          </span>
        </div>
        <div className="np-header__right">
          <button
            type="button"
            className="np-icon-btn"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            onClick={() => setIsFullscreen((v) => !v)}
          >
            {isFullscreen ? (
              <IconMinimize size={15} />
            ) : (
              <IconMaximize size={15} />
            )}
          </button>
          <button
            type="button"
            className="np-icon-btn"
            title="Shortcuts & commands"
            ref={moreBtnRef}
            onClick={openMoreMenu}
          >
            <IconMoreVertical size={15} />
          </button>
        </div>
      </header>

      {/* ZONE 2 — TOOLBAR */}
      <Toolbar editor={editor} />

      {/* ZONE 3a — EDITOR */}
      <div className="np-editor-area">
        <EditorContent editor={editor} />
      </div>

      {/* ZONE 3b — STATUS BAR */}
      <div className="np-statusbar">
        <span className="np-statusbar__count">
          {words} {words === 1 ? 'word' : 'words'} · {lines}{' '}
          {lines === 1 ? 'line' : 'lines'}
        </span>
        {draftEl}
      </div>

      {/* ZONE 4 — FOOTER */}
      <div className="np-footer">
        <button
          type="button"
          className="np-btn-cancel"
          onClick={() => onCancel?.()}
        >
          Cancel
        </button>
        <button type="button" className="np-btn-save" onClick={handleSave}>
          <IconSave size={13} />
          Save
        </button>
      </div>

      {/* FLOATING LAYERS */}
      {moreMenu && (
        <>
          <div className="np-overlay" onMouseDown={() => setMoreMenu(null)} />
          <div
            className="np-floating"
            style={{ top: moreMenu.top, left: moreMenu.left }}
          >
            <div className="np-moremenu" onMouseDown={(e) => e.stopPropagation()}>
              <div className="np-moremenu__title">
                <IconKeyboard size={12} /> Keyboard & commands
              </div>
              {SHORTCUTS.map((s) => (
                <div className="np-moremenu__row" key={s.label}>
                  <span>{s.label}</span>
                  <span className="np-moremenu__key">{s.keys}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {picker && (
        <>
          <div className="np-overlay" onMouseDown={closePicker} />
          <div
            className="np-floating"
            style={{ top: picker.top, left: picker.left }}
          >
            <CommandPicker
              type={picker.type}
              onPick={handlePickerResult}
              onClose={closePicker}
            />
          </div>
        </>
      )}

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
    </div>
  );
}
