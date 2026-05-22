/**
 * DoctorInstructionsCard / index.jsx
 * -------------------------------------------------------------------------
 * Card shell + integration point for the Doctor's Notepad.
 *
 * In a real app this component receives the patient context and talks to a
 * backend. Here it keeps the saved note in local React state and logs the
 * JSON document so the data flow is visible.
 *
 * The note is stored ONLY as TipTap JSON (never HTML) and is passed straight
 * back into the editor as `initialContent` to reload it.
 * -------------------------------------------------------------------------
 */
import { useState, useEffect } from 'react';
import * as Sentry from '@sentry/react';
import DoctorNotePad from './DoctorNotePad';

export default function DoctorInstructionsCard({ patientId = 'pat001' }) {
  useEffect(() => {
    Sentry.setUser({ id: patientId });
    return () => Sentry.setUser(null);
  }, [patientId]);
  // The last persisted note, as TipTap JSON. null = nothing saved yet.
  const [savedNote, setSavedNote] = useState(null);

  const handleSave = (json) => {
    setSavedNote(json);
    // eslint-disable-next-line no-console
    console.log('[DoctorInstructionsCard] saved note (TipTap JSON):', json);
  };

  const handleCancel = () => {
    // eslint-disable-next-line no-console
    console.log('[DoctorInstructionsCard] edit cancelled');
  };

  return (
    <DoctorNotePad
      patientId={patientId}
      initialContent={savedNote}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  );
}
