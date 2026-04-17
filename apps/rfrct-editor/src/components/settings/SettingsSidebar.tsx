import { useEffect, useState } from "react";
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
  const [activeTab, setActiveTab] = useState<"design" | "vj">("design");

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
      <div className="sidebar-tabs" role="tablist" aria-label="Editor modes">
        <button
          type="button"
          role="tab"
          id="tab-design"
          aria-selected={activeTab === "design"}
          aria-controls="panel-design"
          className={`sidebar-tab ${activeTab === "design" ? "sidebar-tab--active" : ""}`}
          onClick={() => setActiveTab("design")}
        >
          Design
        </button>
        <button
          type="button"
          role="tab"
          id="tab-vj"
          aria-selected={activeTab === "vj"}
          aria-controls="panel-vj"
          className={`sidebar-tab ${activeTab === "vj" ? "sidebar-tab--active" : ""}`}
          onClick={() => setActiveTab("vj")}
        >
          VJ
        </button>
      </div>
      {featureHint && (
        <p
          className="field-hint field-hint--feature-nudge"
          role="status"
          aria-live="polite"
        >
          {featureHint}
        </p>
      )}
      {activeTab === "design" ? (
        <div
          id="panel-design"
          role="tabpanel"
          aria-labelledby="tab-design"
          className="sidebar-tab-panel"
        >
          <UploadBlock onFile={onFile} />
          <AppearanceSection {...appearance} />
          <LensSection {...lens} />
          <BloomSection {...bloom} />
          <EffectsSection {...effects} />
          <VideoBackdropSection {...videoBackdrop} />
          <MouseInputSection {...mouseInput} />
          <ShareSettingsSection {...shareSettings} />
          <ExportSection {...exportSection} />
        </div>
      ) : (
        <div
          id="panel-vj"
          role="tabpanel"
          aria-labelledby="tab-vj"
          className="sidebar-tab-panel"
        >
          <AudioSection {...audio} />
        </div>
      )}
    </aside>
  );
}
