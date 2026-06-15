/**
 * suggestionRender.js
 * Shared `render` factory for TipTap Suggestion popups (slash + mention).
 * Mounts a React component in a Tippy popup positioned at the caret.
 */
import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';

export function makeSuggestionRender(Component: any) {
  return () => {
    let component: any;
    let popup: any;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(Component, {
          props,
          editor: props.editor,
        });
        if (!props.clientRect) return;
        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          theme: 'np',
          arrow: false,
          offset: [0, 6],
          maxWidth: 'none',
        });
      },

      onUpdate: (props: any) => {
        component.updateProps(props);
        if (props.clientRect && popup && popup[0]) {
          popup[0].setProps({ getReferenceClientRect: props.clientRect });
        }
      },

      onKeyDown: (props: any) => {
        if (props.event.key === 'Escape') {
          if (popup && popup[0]) popup[0].hide();
          return true;
        }
        return component.ref?.onKeyDown?.(props) ?? false;
      },

      onExit: () => {
        if (popup && popup[0]) popup[0].destroy();
        if (component) component.destroy();
      },
    };
  };
}
