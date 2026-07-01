/**
 * TemplateNodeView.jsx — React NodeView for templateBlock.
 *
 * Wraps the existing <ProseTemplateCard> so the same prose-style fields keep
 * working, but lives INSIDE the ProseMirror editor as one document node.
 * The card's chrome (background, border, shadow) is stripped by CSS scoped
 * under `.doctor-notepad .ProseMirror` so it blends into the surrounding note.
 *
 * Editing a field calls `updateAttributes({ values })`, which writes the new
 * value into the node's attrs — the editor's onUpdate then triggers autosave.
 */
import { useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import ProseTemplateCard from '../../templates/ProseTemplateCard';
import { getTemplateById } from '../../../../data/templates';
import { addCustomTemplate, slugifyShortcut } from '../../../../data/customTemplates';
// Loaded here so the template typography ships with the editor even though
// TemplateStack is no longer rendered.
import '../../styles/prose-template.css';
import type { ProseBlock, Template, TemplateValues } from '../../../../types';

interface TemplateOverrides {
  title?: string;
  prose?: ProseBlock[];
}

interface TemplateNodeViewProps {
  editor: any;
  node: any;
  getPos: () => number;
  updateAttributes: (attrs: any) => void;
  deleteNode: () => void;
  selected: boolean;
}

export default function TemplateNodeView({
  editor,
  node,
  getPos,
  updateAttributes,
  deleteNode,
  selected,
}: TemplateNodeViewProps) {
  // Auto-open edit mode when the doctor just inserted a fresh blank
  // scaffold via the "+ new template" button. Heuristic instead of a
  // dedicated attr: the block is the scaffold id and has no overrides
  // yet → nothing to fill, everything to author.
  const isFreshScaffold =
    node.attrs.templateId === 'tmpl_blank_scaffold' && !node.attrs.overrides;
  const [editing, setEditing] = useState<boolean>(isFreshScaffold);
  const baseTemplate = getTemplateById(node.attrs.templateId);
  const values: TemplateValues = node.attrs.values || {};
  const overrides: TemplateOverrides | null = node.attrs.overrides || null;
  // Per-instance authoring edits layer on top of the shared template; the
  // rest of the app (serializer, values lookup) only ever sees `title`/
  // `prose`, so nothing downstream needs to know overrides exist.
  const template: Template | null = baseTemplate
    ? {
        ...baseTemplate,
        title: overrides?.title ?? baseTemplate.title,
        prose: overrides?.prose ?? baseTemplate.prose,
      }
    : baseTemplate;

  if (!template) {
    // Template definition was removed/renamed — show a stub so the user can
    // delete this orphan node without breaking the doc.
    return (
      <NodeViewWrapper
        as="div"
        data-template-block
        className={`jano-tw tp-orphan${selected ? ' is-node-selected' : ''}`}
      >
        <div className="tp-sheet">
          <div className="tp-head">
            <span className="tp-tag">missing template</span>
            <span className="tp-title">
              {node.attrs.templateId || 'unknown'}
            </span>
            <button
              type="button"
              className="tp-x"
              aria-label="Remove"
              onClick={() => deleteNode()}
            >
              ✕
            </button>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  const handleChange = (patch: Partial<TemplateValues>) =>
    updateAttributes({ values: { ...values, ...patch } });

  const handleRemove = () => {
    // eslint-disable-next-line no-alert
    if (window.confirm('Remove this template from the note?')) {
      deleteNode();
    }
  };

  // Enter/Tab on the last field steps the cursor out of the template and onto
  // the line directly after it, creating that line if the template was the
  // last block in the note.
  const handleExit = () => {
    if (!editor || typeof getPos !== 'function') return;
    const pos = getPos();
    if (pos == null) return;
    const after = pos + node.nodeSize;
    const { doc } = editor.state;
    const $after = doc.resolve(Math.min(after, doc.content.size));
    if (!$after.nodeAfter || !$after.nodeAfter.isTextblock) {
      editor.chain().insertContentAt(after, { type: 'paragraph' }).run();
    }
    editor.chain().focus().setTextSelection(after + 1).run();
  };

  const handleProseChange = (nextProse: ProseBlock[]) =>
    updateAttributes({ overrides: { ...overrides, prose: nextProse } });

  const handleTitleChange = (nextTitle: string) =>
    updateAttributes({ overrides: { ...overrides, title: nextTitle } });

  // Manual "Save" — persists a NEW, independent entry in the custom-template
  // library (never overwrites the shared template this instance started from).
  const handleSaveAsTemplate = (shortcut: string) => {
    if (!template) return;
    const rnd = Math.random().toString(36).slice(2, 8);
    addCustomTemplate({
      ...template,
      id: `tmpl_custom_${Date.now().toString(36)}_${rnd}`,
      shortcut: slugifyShortcut(shortcut),
      custom: true,
    });
  };

  // Native HTML drag needs `draggable` on the actual DOM node. Casual (fill)
  // mode has no contenteditable authoring spans in the way, so hovering the
  // card and dragging just works. Guard: don't hijack drag when the mousedown
  // starts on an actual field/button/input — those need normal click+type.
  const handleDragStart = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    const fromInteractive = !!target.closest(
      '.tp-blank, .tp-pick, .tp-field-x, .tp-field-bolt, .tp-editable-text, .tp-field-naming, .tp-inline-plus, .tp-pencil, .tp-shortcut-input, .tp-save-btn, input, button, select, textarea',
    );
    if (fromInteractive) e.preventDefault();
  };

  return (
    <NodeViewWrapper
      as="div"
      data-template-block
      data-template-id={template.id}
      // `data-drag-handle` on the whole card makes ProseMirror's native drag
      // handler accept a mousedown anywhere in the sheet — the doctor grabs
      // the template like a physical card, no dedicated grip needed. The
      // onDragStart guard still cancels drag when the mousedown was on an
      // actual interactive field/button so those stay clickable.
      data-drag-handle
      draggable={!editing}
      className={`jano-tw${selected ? ' is-node-selected' : ''}${editing ? ' is-editing' : ''}`}
      onDragStart={handleDragStart}
    >
      <ProseTemplateCard
        template={template}
        values={values}
        onChange={handleChange}
        onRemove={handleRemove}
        onExit={handleExit}
        editing={editing}
        onEditToggle={() => setEditing((e) => !e)}
        onProseChange={handleProseChange}
        onTitleChange={handleTitleChange}
        onSaveAsTemplate={handleSaveAsTemplate}
        pendingDelete={selected}
      />
    </NodeViewWrapper>
  );
}
