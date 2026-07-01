/**
 * TemplateNode.js — block-level atom that hosts a clinical template
 * INSIDE the editor flow.
 *
 * The template lives in the document like any paragraph or chip — type
 * around it, type below it, or click its × in the inline header. Backspace
 * from the line after it uses ProseMirror's default atom-node behaviour:
 * the first press turns it into a NodeSelection (the card glows as a
 * warning — see `.is-node-selected` in prose-template.css) and only a
 * second Backspace actually deletes it. Storage: { templateId, values }
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
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      templateId: { default: null },
      values: { default: {} },
      // Per-instance authoring edits (title/heading/text changes, added or
      // removed fields) layered on top of the shared template. Null until
      // the doctor makes the first structural edit in this note; the base
      // template is used until then. Never written back to the shared
      // template definition — see docs/superpowers/specs/2026-07-01-*.
      overrides: { default: null },
      // One-shot flag: true right after the "+ new template" button inserts
      // a blank scaffold, so the NodeView boots into edit mode without a
      // second click. Cleared to false as soon as the view mounts.
      startInEdit: { default: false },
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
});
