import { useEffect } from 'react';
import TemplateSection from './TemplateSection';
import { useTemplateNav } from './useTemplateNav';
import { compactSummary } from './templateSerializer';

const ACCENT_BAR = {
  blue:    'bg-blue-500',
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
  violet:  'bg-violet-500',
  cyan:    'bg-cyan-500',
};

const ACCENT_PILL = {
  blue:    'bg-blue-50 text-blue-700 border-blue-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber:   'bg-amber-50 text-amber-700 border-amber-100',
  violet:  'bg-violet-50 text-violet-700 border-violet-100',
  cyan:    'bg-cyan-50 text-cyan-700 border-cyan-100',
};

export default function TemplateCard({
  template,
  values,
  isCollapsed,
  onChange,
  onToggleCollapse,
  onRemove,
  autoFocusOnMount = false,
}) {
  const nav = useTemplateNav();

  useEffect(() => {
    if (!isCollapsed && autoFocusOnMount) {
      // Defer focus until child FieldRows have registered
      const t = setTimeout(() => nav.focusFirstField(), 30);
      return () => clearTimeout(t);
    }
  }, [isCollapsed, autoFocusOnMount, nav]);

  const handleFieldChange = (fieldId, val) => {
    onChange({ ...values, [fieldId]: val });
  };

  const accentBar = ACCENT_BAR[template.accent] || ACCENT_BAR.blue;
  const accentPill = ACCENT_PILL[template.accent] || ACCENT_PILL.blue;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-3">
      {/* Accent stripe + header */}
      <div className="flex items-stretch">
        <div className={`w-1 ${accentBar}`} aria-hidden />
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex-1 flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${accentPill}`}>
              {template.category}
            </span>
            <span className="text-sm font-semibold text-slate-800 truncate">
              {template.title}
            </span>
            {isCollapsed && (
              <span className="text-xs text-slate-500 truncate ml-2">
                · {compactSummary(template, values)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            <span className="text-slate-400 text-xs">
              {isCollapsed ? '▸ Expand' : '▾ Collapse'}
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="px-3 text-slate-400 hover:text-red-500 hover:bg-red-50 transition border-l border-slate-100"
          title="Remove template"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      {!isCollapsed && (
        <div className="px-4 py-3 bg-slate-50/30">
          {template.sections.map((section) => (
            <TemplateSection
              key={section.title}
              section={section}
              values={values}
              onFieldChange={handleFieldChange}
              nav={nav}
            />
          ))}
        </div>
      )}
    </div>
  );
}
