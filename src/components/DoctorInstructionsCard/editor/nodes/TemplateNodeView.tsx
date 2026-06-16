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
import { NodeViewWrapper } from '@tiptap/react';
import ProseTemplateCard from '../../templates/ProseTemplateCard';
import { getTemplateById } from '../../../../data/templates';
// Loaded here so the template typography ships with the editor even though
// TemplateStack is no longer rendered.
import '../../styles/prose-template.css';
import type { TemplateValues } from '../../../../types';

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
  const template = getTemplateById(node.attrs.templateId);
  const values: TemplateValues = node.attrs.values || {};

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

  return (
    <NodeViewWrapper
      as="div"
      data-template-block
      data-template-id={template.id}
      className={`jano-tw${selected ? ' is-node-selected' : ''}`}
    >
      <ProseTemplateCard
        template={template}
        values={values}
        onChange={handleChange}
        onRemove={handleRemove}
        onExit={handleExit}
      />
    </NodeViewWrapper>
  );
}
