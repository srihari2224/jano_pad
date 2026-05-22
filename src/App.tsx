import './App.css';
import DoctorInstructionsCard from './components/DoctorInstructionsCard';

/* ─── Inline Jano logo SVG (from assets/logos/jano-j.svg) ─── */
function JanoLogo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 1.2)}
      viewBox="0 0 122 147"
      fill="none"
      aria-label="jano"
    >
      <path
        d="M80.834 68C78.6249 68 76.834 66.2091 76.834 64V47.485C76.834 45.2758 75.0432 43.485 72.834 43.485H56C53.7909 43.485 52 41.6941 52 39.485V28.515C52 26.3059 53.7909 24.515 56 24.515H72.834C75.0432 24.515 76.834 22.7242 76.834 20.515V4C76.834 1.79086 78.6249 0 80.834 0H93.166C95.3751 0 97.166 1.79086 97.166 4V20.515C97.166 22.7242 98.9568 24.515 101.166 24.515H118C120.209 24.515 122 26.3059 122 28.515V39.485C122 41.6941 120.209 43.485 118 43.485H101.166C98.9568 43.485 97.166 45.2758 97.166 47.485V64C97.166 66.2091 95.3751 68 93.166 68H80.834Z"
        fill="#E54B4B"
      />
      <path
        d="M2 146.984C0.895432 146.984 0 146.088 0 144.984V131.96C0 130.855 0.895431 129.96 2 129.96H13.952C15.232 129.96 16.256 129.533 17.024 128.68C17.8773 127.912 18.304 126.931 18.304 125.736V57.3359C18.304 56.2313 19.1994 55.3359 20.304 55.3359H36.144C37.2486 55.3359 38.144 56.2313 38.144 57.3359V127.784C38.144 133.672 36.4373 138.323 33.024 141.736C29.6107 145.235 24.8747 146.984 18.816 146.984H2ZM28.032 47.7839C24.8747 47.7839 22.144 46.6319 19.84 44.3279C17.536 42.0239 16.384 39.2932 16.384 36.1359C16.384 32.9785 17.536 30.2479 19.84 27.9439C22.144 25.5545 24.8747 24.3599 28.032 24.3599C31.1893 24.3599 33.92 25.5545 36.224 27.9439C38.528 30.2479 39.68 32.9785 39.68 36.1359C39.68 39.2932 38.528 42.0239 36.224 44.3279C33.92 46.6319 31.1893 47.7839 28.032 47.7839Z"
        fill="#252323"
      />
    </svg>
  );
}

/* ─── App ─── */
export default function App() {
  return (
    <div className="jp-root">

      {/* ── NAV ───────────────────────────────────────────────── */}
      <nav className="jp-nav">
        <div className="jp-wrap">
          <a className="jp-nav__logo" href="#">
            <JanoLogo size={26} />
            <span className="jp-nav__wordmark">jano<span className="jp-accent">+</span></span>
          </a>
          <div className="jp-spacer" />
          <span className="jp-nav__tag">Doctor's Notepad</span>
        </div>
      </nav>

      <main>

        {/* ── HERO INTRO ────────────────────────────────────────── */}
        <section className="jp-hero">
          <div className="jp-cross-wash" aria-hidden="true" />
          <div className="jp-cross-wash jp-cross-wash--two" aria-hidden="true" />

          <div className="jp-wrap">
            <div className="jp-sec-num">01 · NOTEPAD</div>

            <div className="jp-eyebrow">
              <span className="jp-dot" aria-hidden="true" />
              Clinical Documentation Tool
            </div>

            <h1 className="jp-hero__title">
              Doctor's<br />
              Instructions<span className="jp-accent">+</span>
              <span className="jp-hero__sub">
                Rich notes, smart chips, and @mentions — ready in seconds.
              </span>
            </h1>

            <p className="jp-hero__lede">
              Slash commands insert medicine orders, diagnoses, lab tests, and vitals tables instantly.
              @mention any patient or colleague and their context travels with the note.
            </p>

            {/* Floating preview chips */}
            <div className="jp-chips" aria-hidden="true">
              <span className="jp-chip jp-chip--medicine">
                <span className="jp-chip__dot" />Amoxicillin 500mg
              </span>
              <span className="jp-chip jp-chip--diagnosis">
                <span className="jp-chip__dot" />Hypertension · Stage II
              </span>
              <span className="jp-chip jp-chip--lab">
                <span className="jp-chip__dot" />CBC Ordered
              </span>
              <span className="jp-chip jp-chip--saved">
                <span className="jp-chip__dot" />✓ Draft saved
              </span>
            </div>
          </div>
        </section>

        {/* ── FEATURE PILLARS ───────────────────────────────────── */}
        <section className="jp-pillars">
          <div className="jp-wrap">
            <div className="jp-sec-head">
              <div className="jp-sec-num">02 · FEATURES</div>
              <div>
                <h2 className="jp-sec-title">
                  Everything a doctor needs,{' '}
                  <span className="jp-accent">nothing they don't.</span>
                </h2>
              </div>
            </div>

            <div className="jp-pillars__grid">
              <div className="jp-pillar">
                <div className="jp-pillar__ico">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </div>
                <div className="jp-pillar__cap">Slash Commands</div>
                <h4 className="jp-pillar__title">Type <span className="jp-accent">/medicine</span> and your formulary appears.</h4>
                <p className="jp-pillar__body">Insert structured chips for medicines, diagnoses, lab orders, vitals tables, and templates — without leaving the keyboard.</p>
              </div>

              <div className="jp-pillar">
                <div className="jp-pillar__ico">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="jp-pillar__cap">@Mentions</div>
                <h4 className="jp-pillar__title">@mention a patient and their <span className="jp-accent">full context arrives.</span></h4>
                <p className="jp-pillar__body">Age, MRN, chronic conditions, allergies, current medications — surfaced in a popover, right inside the note.</p>
              </div>

              <div className="jp-pillar">
                <div className="jp-pillar__ico">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v14a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                  </svg>
                </div>
                <div className="jp-pillar__cap">Autosave</div>
                <h4 className="jp-pillar__title">Every draft saved. <span className="jp-accent">Nothing ever lost.</span></h4>
                <p className="jp-pillar__body">Notes autosave to local draft every 2 seconds. On return, restore with one click. The note is always where you left it.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── EDITOR SECTION ────────────────────────────────────── */}
        <section className="jp-editor">
          <div className="jp-wrap jp-wrap--narrow">
            <div className="jp-editor__header">
              <div className="jp-sec-num">03 · EDITOR</div>
              <h2 className="jp-editor__title">
                Start writing. <span className="jp-accent">The tools follow.</span>
              </h2>
              <p className="jp-editor__hint">
                Press <kbd>/</kbd> for commands · <kbd>@</kbd> to mention · <kbd>Ctrl S</kbd> to save
              </p>
            </div>
            <DoctorInstructionsCard patientId="pat001" />
          </div>
        </section>

      </main>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="jp-foot">
        <div className="jp-wrap">
          <div className="jp-foot__left">
            <div className="jp-foot__brand">
              <JanoLogo size={22} />
              <span className="jp-foot__wordmark">jano<span className="jp-accent">+</span></span>
            </div>
            <p className="jp-foot__tagline">Connected. Integrated. Care.</p>
            <p className="jp-foot__copy">© Jano Health Solutions Private Limited · 2026</p>
          </div>
          <div className="jp-foot__links">
            <span className="jp-foot__link-label">Platform</span>
            <a href="#">Doctor's Notepad</a>
            <a href="#">Slash Commands</a>
            <a href="#">@Mentions</a>
          </div>
          <div className="jp-foot__links">
            <span className="jp-foot__link-label">Company</span>
            <a href="#">jano.health</a>
            <a href="#">Privacy Policy</a>
            <a href="#">founders@jano.health</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
