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
  node: any;
  updateAttributes: (attrs: any) => void;
  deleteNode: () => void;
  selected: boolean;
}

export default function TemplateNodeView({
  node,
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
      />
    </NodeViewWrapper>
  );
}
