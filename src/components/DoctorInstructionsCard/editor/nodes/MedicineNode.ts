/**
 * MedicineNode.js — inline atom node for a medicine chip.
 * Renders as a green pill; deletes as a single unit.
 * Attributes live in the node's JSON (getJSON), not in DOM attributes.
 */
import { Node } from '@tiptap/core';

export const MedicineNode = Node.create({
  name: 'medicineChip',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      medId: { default: null, renderHTML: () => ({}) },
      name: { default: '', renderHTML: () => ({}) },
      dose: { default: '', renderHTML: () => ({}) },
      category: { default: '', renderHTML: () => ({}) },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-medicine-chip]' }];
  },

  renderHTML({ node }) {
    const { name, dose } = node.attrs;
    return [
      'span',
      { 'data-medicine-chip': '', class: 'np-chip np-chip--medicine' },
      ['span', { class: 'np-chip__dot' }],
      dose ? `${name} · ${dose}` : name,
    ];
  },

  renderText({ node }) {
    const { name, dose } = node.attrs;
    return dose ? `[Rx: ${name} ${dose}]` : `[Rx: ${name}]`;
  },
});
