/**
 * AiLoading.js
 * -------------------------------------------------------------------------
 * A tiny TipTap extension that paints a shimmer/blur decoration over a range
 * of the document while an AI action is in flight. Combined with
 * editor.setEditable(false), this gives the "transform in place" experience:
 * the selected text blurs + shimmers, then is replaced inline with the result.
 *
 * Commands:
 *   editor.commands.setAiLoading({ from, to })  — start the shimmer over a range
 *   editor.commands.clearAiLoading()            — remove it
 * -------------------------------------------------------------------------
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const aiLoadingKey = new PluginKey('aiLoading');

export const AiLoading = Extension.create({
  name: 'aiLoading',

  addCommands() {
    return {
      setAiLoading:
        (range: any) =>
        ({ tr, dispatch }: any) => {
          if (dispatch) dispatch(tr.setMeta(aiLoadingKey, { action: 'set', range }));
          return true;
        },
      clearAiLoading:
        () =>
        ({ tr, dispatch }: any) => {
          if (dispatch) dispatch(tr.setMeta(aiLoadingKey, { action: 'clear' }));
          return true;
        },
    } as any;
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: aiLoadingKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const meta = tr.getMeta(aiLoadingKey);
            if (meta && meta.action === 'set') {
              const { from, to } = meta.range || {};
              if (from == null || to == null || from >= to) {
                return DecorationSet.empty;
              }
              return DecorationSet.create(tr.doc, [
                Decoration.inline(from, to, { class: 'np-ai-shimmer' }),
              ]);
            }
            if (meta && meta.action === 'clear') return DecorationSet.empty;
            // keep the decoration anchored across unrelated transactions
            return old.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return aiLoadingKey.getState(state);
          },
        },
      }),
    ];
  },
});
