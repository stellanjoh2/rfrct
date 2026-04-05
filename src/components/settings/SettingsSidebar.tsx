import { AppearanceSection } from "./AppearanceSection";
import { BloomSection } from "./BloomSection";
import { EffectsSection } from "./EffectsSection";
import { LensSection } from "./LensSection";
import { UploadBlock } from "./UploadBlock";
import type { AppearanceSectionProps } from "./AppearanceSection";
import type { BloomSectionProps } from "./BloomSection";
import type { EffectsSectionProps } from "./EffectsSection";
import type { LensSectionProps } from "./LensSection";

export type SettingsSidebarProps = {
  uiVisible: boolean;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  appearance: AppearanceSectionProps;
  lens: LensSectionProps;
  bloom: BloomSectionProps;
  effects: EffectsSectionProps;
};

export function SettingsSidebar({
  uiVisible,
  onFile,
  appearance,
  lens,
  bloom,
  effects,
}: SettingsSidebarProps) {
  return (
    <aside
      className={`glass-sidebar panel ${uiVisible ? "" : "glass-sidebar--hidden"}`}
      aria-hidden={!uiVisible}
      aria-label="Settings"
    >
      <p className="sidebar-brand">Refrct</p>
      <UploadBlock onFile={onFile} />
      <AppearanceSection {...appearance} />
      <LensSection {...lens} />
      <BloomSection {...bloom} />
      <EffectsSection {...effects} />
      <p className="shortcut-hint">
        <kbd>1</kbd> blob · <kbd>2</kbd> cube · <kbd>3</kbd> metaballs ·{" "}
        <kbd>Space</kbd> pause · <kbd>P</kbd> panel · <kbd>F</kbd> focus ·{" "}
        <kbd>C</kbd> screenshot
      </p>
    </aside>
  );
}
