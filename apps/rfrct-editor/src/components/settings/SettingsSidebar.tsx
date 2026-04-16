import { useEffect } from "react";
import { AppearanceSection } from "./AppearanceSection";
import { AudioSection } from "./AudioSection";
import { BloomSection } from "./BloomSection";
import { EffectsSection } from "./EffectsSection";
import { ExportSection } from "./ExportSection";
import { LensSection } from "./LensSection";
import { MouseInputSection } from "./MouseInputSection";
import { UploadBlock } from "./UploadBlock";
import type { AppearanceSectionProps } from "./AppearanceSection";
import type { AudioSectionProps } from "./AudioSection";
import type { BloomSectionProps } from "./BloomSection";
import type { EffectsSectionProps } from "./EffectsSection";
import type { ExportSectionProps } from "./ExportSection";
import type { LensSectionProps } from "./LensSection";
import type { MouseInputSectionProps } from "./MouseInputSection";
import { ShareSettingsSection } from "./ShareSettingsSection";
import type { ShareSettingsSectionProps } from "./ShareSettingsSection";
import { VideoBackdropSection } from "./VideoBackdropSection";
import type { VideoBackdropSectionProps } from "./VideoBackdropSection";

export type SettingsSidebarProps = {
  uiVisible: boolean;
  featureHint: string | null;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  appearance: AppearanceSectionProps;
  lens: LensSectionProps;
  bloom: BloomSectionProps;
  effects: EffectsSectionProps;
  audio: AudioSectionProps;
  videoBackdrop: VideoBackdropSectionProps;
  mouseInput: MouseInputSectionProps;
  shareSettings: ShareSettingsSectionProps;
  exportSection: ExportSectionProps;
};

export function SettingsSidebar({
  uiVisible,
  featureHint,
  onFile,
  appearance,
  lens,
  bloom,
  effects,
  audio,
  videoBackdrop,
  mouseInput,
  shareSettings,
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
      {featureHint && (
        <p
          className="field-hint field-hint--feature-nudge"
          role="status"
          aria-live="polite"
        >
          {featureHint}
        </p>
      )}
      <UploadBlock onFile={onFile} />
      <AppearanceSection {...appearance} />
      <LensSection {...lens} />
      <BloomSection {...bloom} />
      <EffectsSection {...effects} />
      <AudioSection {...audio} />
      <VideoBackdropSection {...videoBackdrop} />
      <MouseInputSection {...mouseInput} />
      <ShareSettingsSection {...shareSettings} />
      <ExportSection {...exportSection} />
      <div className="shortcut-hint">
        <p className="shortcut-hint__title">Mouse (canvas)</p>
        <p className="shortcut-hint__line">
          <strong>Left-drag</strong> — pan image · <strong>Right-drag</strong> — move
          lens · <strong>Wheel</strong> — zoom. <strong>Mouse input</strong> follows the
          pointer with fluid delay when enabled (right-drag off).
        </p>
        <p className="shortcut-hint__title">Keyboard</p>
        <p className="shortcut-hint__line">
          <kbd>1</kbd> blob · <kbd>2</kbd> cube · <kbd>3</kbd> metaballs ·{" "}
          <kbd>4</kbd> water ·{" "}
          <kbd>Space</kbd> pause animation · <kbd>P</kbd> toggle panel ·{" "}
          <kbd>F</kbd> FPS · <kbd>Shift</kbd>+<kbd>F</kbd> focus (reset pan & scale) ·{" "}
          <kbd>C</kbd> PNG (2×, export options)
        </p>
        <p className="shortcut-hint__note">
          Shortcuts don&apos;t apply while a text field or dropdown is focused.
        </p>
      </div>
    </aside>
  );
}
