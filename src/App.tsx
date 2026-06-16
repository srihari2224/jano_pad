import { useCallback, useEffect, useRef, useState } from 'react';
import PageShell from './components/PageShell/PageShell';
import DoctorInstructionsCard from './components/DoctorInstructionsCard';
import AuthGate from './auth/AuthGate';
import type { EditorApi } from './types';

const PATIENT_ID = 'pat001';
const titleKey = (pid: string) => `page_title_${pid}`;

export default function App() {
  // The editor lives inside DoctorNotePad; it hands an imperative API up here
  // (via onReady) so the surrounding shell can drive outline/search/save/etc.
  const [editorApi, setEditorApi] = useState<EditorApi | null>(null);

  // Page title is owned here so it survives reloads (P1-1: previously the title
  // lived only in PageShell local state and reset to "Untitled Page").
  const [title, setTitle] = useState('');
  const titleLoaded = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(titleKey(PATIENT_ID));
      if (saved) setTitle(saved);
    } catch {
      /* ignore */
    }
    titleLoaded.current = true;
  }, []);

  const handleTitleChange = useCallback((next: string) => {
    setTitle(next);
    try {
      if (next.trim()) localStorage.setItem(titleKey(PATIENT_ID), next);
      else localStorage.removeItem(titleKey(PATIENT_ID));
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <AuthGate>
      <PageShell
        patientId={PATIENT_ID}
        editorApi={editorApi}
        title={title}
        onTitleChange={handleTitleChange}
      >
        <DoctorInstructionsCard patientId={PATIENT_ID} onReady={setEditorApi} />
      </PageShell>
    </AuthGate>
  );
}
