import { useEffect } from "react";
import { AppearanceSection } from "./AppearanceSection";
import { AudioSection } from "./AudioSection";
import { BloomSection } from "./BloomSection";
import { EffectsSection } from "./EffectsSection";
import { ExportSection } from "./ExportSection";
import { LensSection } from "./LensSection";
import { UploadBlock } from "./UploadBlock";
import type { AppearanceSectionProps } from "./AppearanceSection";
import type { AudioSectionProps } from "./AudioSection";
import type { BloomSectionProps } from "./BloomSection";
import type { EffectsSectionProps } from "./EffectsSection";
import type { ExportSectionProps } from "./ExportSection";
import type { LensSectionProps } from "./LensSection";

export type SettingsSidebarProps = {
  uiVisible: boolean;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  appearance: AppearanceSectionProps;
  lens: LensSectionProps;
  bloom: BloomSectionProps;
  effects: EffectsSectionProps;
  audio: AudioSectionProps;
  exportSection: ExportSectionProps;
};

export function SettingsSidebar({
  uiVisible,
  onFile,
  appearance,
  lens,
  bloom,
  effects,
  audio,
  exportSection,
}: SettingsSidebarProps) {
  useEffect(() => {
    const clearRangeDrag = () => {
      document
        .querySelectorAll(".field--range-dragging")
        .forEach((el) => el.classList.remove("field--range-dragging"));
    };
    window.addEventListener("pointerup", clearRangeDrag);
    window.addEventListener("pointercancel", clearRangeDrag);
    return () => {
      window.removeEventListener("pointerup", clearRangeDrag);
      window.removeEventListener("pointercancel", clearRangeDrag);
      clearRangeDrag();
    };
  }, []);

  return (
    <aside
      className={`glass-sidebar panel ${uiVisible ? "" : "glass-sidebar--hidden"}`}
      aria-hidden={!uiVisible}
      aria-label="Settings"
      onPointerDownCapture={(e) => {
        const t = e.target as HTMLElement;
        if (t.matches("input[type=\"range\"]")) {
          t.closest(".field")?.classList.add("field--range-dragging");
        }
      }}
    >
      <p className="sidebar-brand">Refrct</p>
      <UploadBlock onFile={onFile} />
      <AppearanceSection {...appearance} />
      <LensSection {...lens} />
      <BloomSection {...bloom} />
      <EffectsSection {...effects} />
      <AudioSection {...audio} />
      <ExportSection {...exportSection} />
      <div className="shortcut-hint">
        <p className="shortcut-hint__title">Mouse (canvas)</p>
        <p className="shortcut-hint__line">
          <strong>Left-drag</strong> — pan image · <strong>Right-drag</strong> — move
          lens · <strong>Wheel</strong> — zoom
        </p>
        <p className="shortcut-hint__title">Keyboard</p>
        <p className="shortcut-hint__line">
          <kbd>1</kbd> blob · <kbd>2</kbd> cube · <kbd>3</kbd> metaballs ·{" "}
          <kbd>4</kbd> water ·{" "}
          <kbd>Space</kbd> pause animation · <kbd>P</kbd> toggle panel ·{" "}
          <kbd>F</kbd> focus (reset pan & scale) · <kbd>C</kbd> PNG (2×, export options)
        </p>
        <p className="shortcut-hint__note">
          Shortcuts don&apos;t apply while a text field or dropdown is focused.
        </p>
      </div>
    </aside>
  );
}
