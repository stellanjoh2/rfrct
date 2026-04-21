import { useState } from "react";
import {
  DESIGN_TEMPLATES,
  type DesignTemplateId,
} from "../../designTemplates";

export type TemplatesSectionProps = {
  onApplyTemplate: (id: DesignTemplateId) => void;
};

export function TemplatesSection({ onApplyTemplate }: TemplatesSectionProps) {
  const [value, setValue] = useState("");

  return (
    <>
      <h2 title="Color and effect presets — your Layer 1 and Layer 2 uploads are unchanged">
        Templates
      </h2>
      <section className="field">
        <select
          id="design-template-select"
          className="field-select"
          aria-label="Template"
          value={value}
          onChange={(e) => {
            const id = e.target.value as DesignTemplateId | "";
            setValue(id);
            if (id) {
              onApplyTemplate(id);
              queueMicrotask(() => setValue(""));
            }
          }}
        >
          <option value="">Choose a template…</option>
          {DESIGN_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="field-hint templates-section__hint">
          Colors, lens, bloom, effects, backdrop, and VJ options only — not your logos
          or images.
        </p>
      </section>
    </>
  );
}
