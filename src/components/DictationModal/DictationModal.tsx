import { useCallback, useEffect, useRef, useState } from 'react';
import type { EditorApi } from '../../types/index';
import './dictation.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editorApi: EditorApi | null;
}

const NUM_BARS = 34;

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
function CancelIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4" width="4" height="16" rx="1.5"/><rect x="14" y="4" width="4" height="16" rx="1.5"/>
    </svg>
  );
}
function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5,3 19,12 5,21"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20,6 9,17 4,12"/>
    </svg>
  );
}

export default function DictationModal({ isOpen, onClose, editorApi }: Props) {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array(NUM_BARS).fill(0.15));
  const [hasAudio, setHasAudio] = useState(false);

  const recognitionRef = useRef<unknown>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const finalRef = useRef('');

  const stopVisualizer = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    try { audioCtxRef.current?.close(); } catch { /* ignore */ }
    analyserRef.current = null;
    streamRef.current = null;
    audioCtxRef.current = null;
    animFrameRef.current = null;
    setLevels(Array(NUM_BARS).fill(0.05));
  }, []);

  const startVisualizer = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasAudio(true);
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      src.connect(analyser);
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buf);
        setLevels(
          Array.from({ length: NUM_BARS }, (_, i) => {
            const idx = Math.floor((i / NUM_BARS) * buf.length * 0.65);
            return Math.max(0.06, Math.min(1, buf[idx] / 210));
          })
        );
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setHasAudio(false);
    }
  }, []);

  const stopRecognition = useCallback(() => {
    try { (recognitionRef.current as { abort?: () => void })?.abort?.(); } catch { /* ignore */ }
    recognitionRef.current = null;
  }, []);

  const startRecognition = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (e: { resultIndex: number; results: SpeechRecognitionResultList }) => {
      let interim = '';
      let finalPart = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalPart += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (finalPart) {
        finalRef.current += finalPart;
        setTranscript(finalRef.current);
      }
      setInterimTranscript(interim);
    };
    rec.onerror = (e: { error: string }) => {
      if (e.error !== 'aborted') console.warn('Speech recognition error:', e.error);
    };
    rec.start();
    recognitionRef.current = rec;
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    finalRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setSeconds(0);
    setIsPaused(false);
    setHasAudio(false);

    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    startRecognition();
    startVisualizer();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopRecognition();
      stopVisualizer();
    };
  }, [isOpen, startRecognition, startVisualizer, stopRecognition, stopVisualizer]);

  const handlePause = () => {
    if (isPaused) {
      startRecognition();
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
      startVisualizer();
      setIsPaused(false);
    } else {
      stopRecognition();
      if (timerRef.current) clearInterval(timerRef.current);
      stopVisualizer();
      setIsPaused(true);
    }
  };

  const handleSave = () => {
    const full = (
      transcript + (interimTranscript ? ' ' + interimTranscript : '')
    ).trim();
    if (full && editorApi?.editor) {
      editorApi.editor.chain().focus().insertContent(full + ' ').run();
    }
    onClose();
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m} : ${String(sec).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const displayText = transcript + (interimTranscript ? ' ' + interimTranscript : '');

  return (
    <div className="dict-backdrop" onMouseDown={onClose}>
      <div className="dict-sheet" onMouseDown={e => e.stopPropagation()}>
        <div className="dict-drag-handle" />

        <div className="dict-header">
          <div>
            <h2 className="dict-title">Dictating RX</h2>
            <p className="dict-subtitle">Speak clearly — AI transcribes in real time</p>
          </div>
          <button className="dict-close" type="button" onClick={onClose} aria-label="Close">
            <CancelIcon />
          </button>
        </div>

        {/* Waveform */}
        <div className={`dict-wave${!hasAudio ? ' dict-wave--idle' : ''}`}>
          {levels.map((lvl, i) => (
            <div
              key={i}
              className={`dict-bar${isPaused ? ' dict-bar--paused' : ''}`}
              style={{ '--lvl': lvl } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Timer */}
        <div className="dict-timer">{fmtTime(seconds)}</div>

        <div className="dict-status">
          <span className={`dict-dot${isPaused ? ' dict-dot--paused' : ''}`} />
          {isPaused ? 'Paused' : 'Recording in progress'}
        </div>

        {/* Live transcript */}
        <div className="dict-transcript-box">
          <div className="dict-transcript-label">
            <span className="dict-transcript-badge" />
            LIVE TRANSCRIPT
          </div>
          <div className="dict-transcript-text">
            {displayText ? (
              <>
                {transcript}
                {interimTranscript && (
                  <span className="dict-interim">{interimTranscript}</span>
                )}
              </>
            ) : (
              <span className="dict-placeholder">Start speaking…</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="dict-actions">
          <button className="dict-btn dict-btn--cancel" type="button" onClick={onClose}>
            <CancelIcon /> Cancel
          </button>
          <button className="dict-btn dict-btn--pause" type="button" onClick={handlePause}>
            {isPaused ? <><PlayIcon /> Resume</> : <><PauseIcon /> Pause</>}
          </button>
          <button className="dict-btn dict-btn--save" type="button" onClick={handleSave}>
            <CheckIcon /> Save
          </button>
        </div>

        {/* Mic icon center decorative */}
        <div className="dict-mic-hint">
          {!hasAudio && !isPaused && (
            <span className="dict-mic-hint__text">
              <MicIcon /> Allow microphone for live waveform
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
