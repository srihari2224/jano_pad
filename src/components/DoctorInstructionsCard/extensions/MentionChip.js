/**
 * MentionChip.js — configured @-mention extension.
 *
 * Builds on @tiptap/extension-mention. Each chip stores a full SNAPSHOT of
 * the patient/doctor at insertion time inside `node.attrs.snapshot`, so the
 * note stays a permanent record even if the source data later changes.
 */
import Mention from '@tiptap/extension-mention';
import { getInitials, ageYears } from '../utils';

export function buildMentionExtension({ items, render }) {
  return Mention.extend({
    name: 'mention',

    addAttributes() {
      return {
        id: { default: null },
        label: { default: '' },
        mentionType: { default: 'patient' }, // 'patient' | 'doctor'
        snapshot: { default: null }, // full entity snapshot
      };
    },

    // Plain-text representation for editor.getText() / word count.
    renderText({ node }) {
      return `@${node.attrs.label || ''}`;
    },
  }).configure({
    HTMLAttributes: { class: 'np-chip' },

    // Full control over how a chip renders inside the document.
    renderHTML({ node }) {
      const type = node.attrs.mentionType || 'patient';
      const snap = node.attrs.snapshot || {};
      const name = snap.name || node.attrs.label || '';
      const initials = getInitials(name);

      const text =
        type === 'doctor'
          ? ` @${name} · ${snap.specialization || ''} · ${snap.room || ''}`
          : ` @${name} · ${snap.mrn || ''} · Age ${ageYears(snap.age)} · ${
              snap.status || ''
            }`;

      return [
        'span',
        {
          class: `np-chip np-chip--${type}`,
          'data-type': 'mention',
          'data-mention-type': type,
          'data-id': node.attrs.id || '',
        },
        ['span', { class: 'np-chip__avatar' }, initials],
        text,
      ];
    },

    suggestion: {
      char: '@',
      items,
      render,
      // `props` is the selected mention object from searchMentions().
      command: ({ editor, range, props }) => {
        editor
          .chain()
          .focus()
          .insertContentAt(range, [
            {
              type: 'mention',
              attrs: {
                id: props.id,
                label: props.name,
                mentionType: props.type,
                snapshot: props,
              },
            },
            { type: 'text', text: ' ' },
          ])
          .run();
      },
    },
  });
}
