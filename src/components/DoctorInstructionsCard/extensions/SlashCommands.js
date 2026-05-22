/**
 * SlashCommands.js — TipTap extension that fires a Suggestion popup on "/".
 *
 * `items` and `render` are supplied via .configure() by DoctorNotePad.
 * The "/" trigger char and the command handler are fixed here so a shallow
 * .configure() merge can't drop them.
 *
 * Each command object carries an `onSelect({ editor, range })` callback.
 */
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      items: () => [],
      render: () => ({}),
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        startOfLine: false,
        items: this.options.items,
        render: this.options.render,
        // `props` is the command object the user picked.
        command: ({ editor, range, props }) => {
          props.onSelect({ editor, range });
        },
      }),
    ];
  },
});
