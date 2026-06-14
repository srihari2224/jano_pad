/**
 * TemplateNode.js — block-level atom that hosts a clinical template
 * INSIDE the editor flow.
 *
 * The template lives in the document like any paragraph or chip — type
 * around it, type below it, delete with Backspace from the line after it,
 * or click its × in the inline header. Storage: { templateId, values }
 * persist with the rest of the doc in editor.getJSON().
 */
import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import TemplateNodeView from './TemplateNodeView';

export const TemplateNode = Node.create({
  name: 'templateBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  isolating: true,

  addAttributes() {
    return {
      templateId: { default: null },
      values: { default: {} },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-template-block]' }];
  },

  renderHTML({ node }) {
    return [
      'div',
      {
        'data-template-block': '',
        'data-template-id': node.attrs.templateId || '',
      },
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TemplateNodeView);
  },

  /**
   * One-press Backspace delete: when the cursor sits at the start of the
   * block immediately AFTER a templateBlock, remove the template entirely.
   * (Standard ProseMirror selects it first; we collapse that to one press.)
   */
  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { state, view } = this.editor;
        const { selection } = state;
        if (!selection.empty) return false;
        const { $from } = selection;
        if ($from.parentOffset !== 0) return false;
        const before = $from.nodeBefore;
        if (before && before.type.name === 'templateBlock') {
          const start = $from.pos - before.nodeSize;
          view.dispatch(state.tr.delete(start, $from.pos));
          return true;
        }
        return false;
      },
    };
  },
});
