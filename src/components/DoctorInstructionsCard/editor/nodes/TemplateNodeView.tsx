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
import { useLayoutEffect, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import ProseTemplateCard from '../../templates/ProseTemplateCard';
import { getTemplateById } from '../../../../data/templates';
import { consumeTemplateInsert } from './templateFocusSignal';
// Loaded here so the template typography ships with the editor even though
// TemplateStack is no longer rendered.
import '../../styles/prose-template.css';
import type { TemplateValues } from '../../../../types';

interface TemplateNodeViewProps {
  node: any;
  updateAttributes: (attrs: any) => void;
  deleteNode: () => void;
  selected: boolean;
  editor: any;
  getPos: () => number;
}

export default function TemplateNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
  getPos,
}: TemplateNodeViewProps) {
  const template = getTemplateById(node.attrs.templateId);
  const values: TemplateValues = node.attrs.values || {};

  // When this template was just inserted, drop the cursor on its first field.
  const wrapRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!consumeTemplateInsert()) return;
    const root = wrapRef.current;
    if (!root) return;

    const placeCaret = (el: HTMLElement) => {
      el.focus();
      if (!el.isContentEditable) return;
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(r);
      }
    };

    let done = false;
    const focusFirst = (): boolean => {
      const first = root.querySelector<HTMLElement>('.tp-blank, .tp-pick');
      if (!first) return false;
      done = true;
      // Defer: applyTemplate just set PM's selection to the trailing paragraph,
      // and PM reverts any field focus until it finishes that sync — so focus
      // once it has settled. Re-assert on the next frame too, to be safe.
      window.setTimeout(() => placeCaret(first), 0);
      requestAnimationFrame(() => placeCaret(first));
      return true;
    };

    // Fields render into the wrapper a tick later; watch for them if not yet here.
    if (focusFirst()) return;
    const obs = new MutationObserver(() => {
      if (!done && focusFirst()) obs.disconnect();
    });
    obs.observe(root, { childList: true, subtree: true });
    const stop = window.setTimeout(() => obs.disconnect(), 2000);
    return () => {
      obs.disconnect();
      window.clearTimeout(stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pressing Enter on the last field exits the template onto a fresh line below.
  const exitToNextLine = () => {
    if (typeof getPos !== 'function') return;
    const after = getPos() + node.nodeSize;
    const { doc } = editor.state;
    const nodeAfter = after <= doc.content.size ? doc.nodeAt(after) : null;
    if (nodeAfter && nodeAfter.type.name === 'paragraph' && nodeAfter.content.size === 0) {
      // reuse the empty paragraph applyTemplate already placed after the block
      editor.chain().focus().setTextSelection(after + 1).run();
    } else {
      editor
        .chain()
        .focus()
        .insertContentAt(after, { type: 'paragraph' })
        .setTextSelection(after + 1)
        .run();
    }
  };

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
      ref={wrapRef}
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
        onExitToNextLine={exitToNextLine}
      />
    </NodeViewWrapper>
  );
}
