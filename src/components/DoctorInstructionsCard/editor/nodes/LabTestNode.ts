/**
 * LabTestNode.js — inline atom node for a lab test chip.
 * Renders as an amber pill showing "name · turnaround"; deletes as one unit.
 */
import { Node } from '@tiptap/core';

export const LabTestNode = Node.create({
  name: 'labTestChip',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      labId: { default: null, renderHTML: () => ({}) },
      name: { default: '', renderHTML: () => ({}) },
      category: { default: '', renderHTML: () => ({}) },
      turnaround: { default: '', renderHTML: () => ({}) },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-labtest-chip]' }];
  },

  renderHTML({ node }) {
    const { name, turnaround } = node.attrs;
    return [
      'span',
      { 'data-labtest-chip': '', class: 'np-chip np-chip--labtest' },
      ['span', { class: 'np-chip__dot' }],
      turnaround ? `${name} · ${turnaround}` : name,
    ];
  },

  renderText({ node }) {
    return `[Lab: ${node.attrs.name}]`;
  },
});
