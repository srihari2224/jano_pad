import '../styles/tw.css';
import '../../PageShell/prose-template.css';
import TemplateCard from './TemplateCard';
import ProseTemplateCard from './ProseTemplateCard';

/**
 * TemplateStack — renders all applied template instances vertically.
 * Wrapped in `.jano-tw` so Tailwind component classes scope correctly.
 */
export default function TemplateStack({
  instances,
  onUpdate,
  onRemove,
  onToggleCollapse,
  lastAddedId,
}) {
  if (!instances.length) return null;

  return (
    <div className="jano-tw font-ui px-4 pt-4 pb-2">
      {instances.map((inst) =>
        inst.template.prose ? (
          <ProseTemplateCard
            key={inst.instanceId}
            template={inst.template}
            values={inst.values}
            onChange={(values) => onUpdate(inst.instanceId, { values })}
            onRemove={() => onRemove(inst.instanceId)}
          />
        ) : (
          <TemplateCard
            key={inst.instanceId}
            template={inst.template}
            values={inst.values}
            isCollapsed={inst.collapsed}
            autoFocusOnMount={inst.instanceId === lastAddedId}
            onChange={(values) => onUpdate(inst.instanceId, { values })}
            onToggleCollapse={() => onToggleCollapse(inst.instanceId)}
            onRemove={() => onRemove(inst.instanceId)}
          />
        ),
      )}
    </div>
  );
}
