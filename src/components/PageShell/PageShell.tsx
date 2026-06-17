import { useEffect, useState } from 'react';
import type { EditorApi } from '../../types/index';
import DictationModal from '../DictationModal/DictationModal';
import './pageshell.css';
import './dark-page.css';

const DEMO_SEEN_KEY = 'janopad_demo_seen';

function MicIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  );
}

export default function PageShell({
  children,
  patientId,
  editorApi,
  title,
  onTitleChange,
}: {
  children: React.ReactNode;
  patientId: string;
  editorApi: EditorApi | null;
  title: string;
  onTitleChange: (next: string) => void;
}) {
  const [isDictating, setIsDictating] = useState(false);

  // First-visit demo CTA: show only when there's no saved draft for this
  // patient and the demo hasn't been loaded before.
  const [showDemo, setShowDemo] = useState(false);
  useEffect(() => {
    try {
      const hasDraft = !!localStorage.getItem(`draft_note_${patientId}`);
      const seen = !!localStorage.getItem(DEMO_SEEN_KEY);
      setShowDemo(!hasDraft && !seen);
    } catch {
      /* ignore */
    }
  }, [patientId]);

  const handleLoadDemo = () => {
    editorApi?.loadDemo();
    setShowDemo(false);
  };

  const focusBody = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      editorApi?.editor?.commands.focus('start');
    }
  };

  return (
    <div className="cap-root cap-root--bare">
      <main className="cap-content">
        <div className="cap-page">
          <div className="cap-page__titlerow">
            <input
              className="cap-page__title"
              placeholder="Page Title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onKeyDown={focusBody}
              spellCheck={false}
            />
            {showDemo && editorApi && (
              <button
                type="button"
                className="cap-demo-btn"
                onClick={handleLoadDemo}
              >
                Demo
              </button>
            )}
            <button
              type="button"
              className={`cap-dictate-btn${isDictating ? ' is-recording' : ''}`}
              onClick={() => setIsDictating(true)}
              aria-label="Start voice dictation"
            >
              <MicIcon />
              Dictate
            </button>
          </div>
          <div className="cap-page__body">{children}</div>
        </div>
      </main>

      <footer className="cap-footer">
        <span className="cap-footer__logo" aria-label="Jano Health">
          <span className="cap-footer__jano">jano</span>
          <span className="cap-footer__plus">+</span>
        </span>
      </footer>

      <DictationModal
        isOpen={isDictating}
        onClose={() => setIsDictating(false)}
        editorApi={editorApi}
      />
    </div>
  );
}
