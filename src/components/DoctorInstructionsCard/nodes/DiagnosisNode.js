/**
 * DiagnosisNode.js — inline atom node for a diagnosis chip.
 * Renders as a blue pill showing "ICD · name"; deletes as one unit.
 */
import { Node } from '@tiptap/core';

export const DiagnosisNode = Node.create({
  name: 'diagnosisChip',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      diagId: { default: null, renderHTML: () => ({}) },
      name: { default: '', renderHTML: () => ({}) },
      icd: { default: '', renderHTML: () => ({}) },
      category: { default: '', renderHTML: () => ({}) },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-diagnosis-chip]' }];
  },

  renderHTML({ node }) {
    const { name, icd } = node.attrs;
    return [
      'span',
      { 'data-diagnosis-chip': '', class: 'np-chip np-chip--diagnosis' },
      ['span', { class: 'np-chip__dot' }],
      icd ? `${icd} · ${name}` : name,
    ];
  },

  renderText({ node }) {
    const { name, icd } = node.attrs;
    return icd ? `[Dx: ${icd} ${name}]` : `[Dx: ${name}]`;
  },
});
