/**
 * PageShell — minimal page wrapper that renders the notepad directly.
 *
 * The previous Capacities-style chrome (top bar, left sidebar with
 * outline/tasks/files/search tabs, and the floating action buttons) was
 * removed per request — only the editable page title and the editor body
 * remain. The notepad autosaves to localStorage on its own, so no Save
 * button is needed.
 */
import type { EditorApi } from '../../types';
import './pageshell.css';
import './dark-page.css';

export default function PageShell({
  children,
  title,
  onTitleChange,
}: {
  children: React.ReactNode;
  /** Reserved for Phase 4 (per-patient note routing). */
  patientId: string;
  /** Still accepted (App wires it) but no longer used by the bare shell. */
  editorApi: EditorApi | null;
  title: string;
  onTitleChange: (next: string) => void;
}) {
  return (
    <div className="cap-root cap-root--bare">
      <main className="cap-content">
        <div className="cap-page">
          <input
            className="cap-page__title"
            placeholder="Page Title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            spellCheck={false}
          />
          <div className="cap-page__body">{children}</div>
        </div>
      </main>
    </div>
  );
}
