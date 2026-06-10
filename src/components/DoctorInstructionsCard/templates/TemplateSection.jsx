import FieldRow from './FieldRow';

export default function TemplateSection({ section, values, onFieldChange, nav }) {
  return (
    <section className="mb-4 last:mb-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1 mb-1">
        {section.title}
      </h3>
      <div className="divide-y divide-slate-50">
        {section.fields.map((field) => (
          <FieldRow
            key={field.id}
            field={field}
            value={values[field.id]}
            onChange={(v) => onFieldChange(field.id, v)}
            nav={nav}
          />
        ))}
      </div>
    </section>
  );
}
