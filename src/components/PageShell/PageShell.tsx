/**
 * PageShell — a Capacities-style document workspace.
 * Dark theme: full-width top bar, left sidebar (doc tabs + Tasks panel),
 * and a large content area with an editable page title. Children render
 * as the page body.
 */
import { useState } from 'react';
import {
  IcoSidebar,
  IcoChevronDown,
  IcoGrid,
  IcoMonitor,
  IcoList,
  IcoCheckCircle,
  IcoPaperclip,
  IcoSearch,
  IcoDots,
  IcoFolder,
  IcoDocPlus,
} from './icons';
import './pageshell.css';
import './dark-page.css';

const SIDE_TABS = [
  { id: 'outline', label: 'Outline', Icon: IcoList },
  { id: 'tasks', label: 'Tasks', Icon: IcoCheckCircle },
  { id: 'files', label: 'Files', Icon: IcoPaperclip },
  { id: 'search', label: 'Search', Icon: IcoSearch },
];

export default function PageShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');
  const [title, setTitle] = useState('');

  const displayTitle = title.trim() || 'Untitled Page';

  return (
    <div className={`cap-root${sidebarOpen ? '' : ' cap-root--collapsed'}`}>
      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <header className="cap-topbar">
        <div className="cap-topbar__left">
          <button className="cap-iconbtn" type="button" aria-label="Apps">
            <IcoGrid size={18} />
          </button>
          <button
            className="cap-iconbtn cap-sidebar-toggle"
            type="button"
            aria-label="Toggle sidebar"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <IcoSidebar size={18} />
            <IcoChevronDown size={12} />
          </button>
        </div>

        <div className="cap-topbar__right" />
      </header>

      <div className="cap-body">
        {/* ── SIDEBAR ───────────────────────────────────────── */}
        <aside
          className="cap-sidebar"
          style={{
            width: sidebarOpen ? 300 : 0,
            paddingLeft: sidebarOpen ? undefined : 0,
            paddingRight: sidebarOpen ? undefined : 0,
            opacity: sidebarOpen ? 1 : 0,
            pointerEvents: sidebarOpen ? undefined : 'none',
          }}
        >
          <div className="cap-sidebar__doc">
            <span className="cap-sidebar__doc-ico">
              <IcoMonitor size={18} />
            </span>
            <span className="cap-sidebar__doc-name">{displayTitle}</span>
          </div>

          <div className="cap-sidebar__tabs">
            {SIDE_TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                title={label}
                aria-label={label}
                className={`cap-tab${activeTab === id ? ' is-active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={17} />
              </button>
            ))}
          </div>

          <div className="cap-sidebar__section">
            <span className="cap-sidebar__section-title">Tasks</span>
            <button className="cap-iconbtn cap-iconbtn--sm" type="button" aria-label="Section menu">
              <IcoDots size={16} />
            </button>
          </div>

          <p className="cap-sidebar__empty">
            Tasks inside this document will appear here.
          </p>

          <div className="cap-sidebar__fabs">
            <button className="cap-fab" type="button" aria-label="Files">
              <IcoFolder size={20} />
            </button>
            <button className="cap-fab cap-fab--primary" type="button" aria-label="New page">
              <IcoDocPlus size={20} />
            </button>
          </div>
        </aside>

        {/* ── CONTENT ───────────────────────────────────────── */}
        <main className="cap-content">
          <div className="cap-page">
            <input
              className="cap-page__title"
              placeholder="Page Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              spellCheck={false}
            />
            <div className="cap-page__body">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
