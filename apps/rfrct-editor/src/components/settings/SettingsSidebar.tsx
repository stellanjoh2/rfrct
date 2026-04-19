import { forwardRef, useEffect, useState } from "react";
import { AppearanceSection } from "./AppearanceSection";
import { AudioSection } from "./AudioSection";
import { DupStackSection } from "./DupStackSection";
import { BloomSection } from "./BloomSection";
import { EffectsSection } from "./EffectsSection";
import { ExportPage } from "./ExportPage";
import type { ExportPageProps } from "./ExportPage";
import { LensSection } from "./LensSection";
import { MouseInputSection } from "./MouseInputSection";
import { UploadBlock } from "./UploadBlock";
import type { AppearanceSectionProps } from "./AppearanceSection";
import { SecondaryLayerSection } from "./SecondaryLayerSection";
import type { SecondaryLayerSectionProps } from "./SecondaryLayerSection";
import type { AudioSectionProps } from "./AudioSection";
import type { DupStackSectionProps } from "./DupStackSection";
import type { BloomSectionProps } from "./BloomSection";
import type { EffectsSectionProps } from "./EffectsSection";
import type { LensSectionProps } from "./LensSection";
import type { MouseInputSectionProps } from "./MouseInputSection";
import { ShareSettingsSection } from "./ShareSettingsSection";
import type { ShareSettingsSectionProps } from "./ShareSettingsSection";
import { VideoBackdropSection } from "./VideoBackdropSection";
import type { VideoBackdropSectionProps } from "./VideoBackdropSection";

export type SettingsSidebarProps = {
  uiVisible: boolean;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  appearance: AppearanceSectionProps;
  secondaryLayer: SecondaryLayerSectionProps;
  lens: LensSectionProps;
  dupStack: DupStackSectionProps;
  bloom: BloomSectionProps;
  effects: EffectsSectionProps;
  audio: AudioSectionProps;
  videoBackdrop: VideoBackdropSectionProps;
  mouseInput: MouseInputSectionProps;
  shareSettings: ShareSettingsSectionProps;
  exportPage: ExportPageProps;
};

export const SettingsSidebar = forwardRef<HTMLElement, SettingsSidebarProps>(
  function SettingsSidebar(
    {
      uiVisible,
      onFile,
      appearance,
      secondaryLayer,
      lens,
      dupStack,
      bloom,
      effects,
      audio,
      videoBackdrop,
      mouseInput,
      shareSettings,
      exportPage,
    },
    ref,
  ) {
  const [activeTab, setActiveTab] = useState<"design" | "vj" | "export">(
    "design",
  );

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
      ref={ref}
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
        <button
          type="button"
          role="tab"
          id="tab-export"
          aria-selected={activeTab === "export"}
          aria-controls="panel-export"
          className={`sidebar-tab ${activeTab === "export" ? "sidebar-tab--active" : ""}`}
          onClick={() => setActiveTab("export")}
        >
          Export
        </button>
      </div>
      {activeTab === "design" ? (
        <div
          id="panel-design"
          role="tabpanel"
          aria-labelledby="tab-design"
          className="sidebar-tab-panel"
        >
          <UploadBlock onFile={onFile} />
          <AppearanceSection {...appearance} />
          <SecondaryLayerSection {...secondaryLayer} />
          <LensSection {...lens} />
          <BloomSection {...bloom} />
          <EffectsSection {...effects} />
          <DupStackSection {...dupStack} />
          <VideoBackdropSection {...videoBackdrop} />
          <MouseInputSection {...mouseInput} />
          <ShareSettingsSection {...shareSettings} />
        </div>
      ) : activeTab === "vj" ? (
        <div
          id="panel-vj"
          role="tabpanel"
          aria-labelledby="tab-vj"
          className="sidebar-tab-panel"
        >
          <AudioSection {...audio} />
        </div>
      ) : (
        <div
          id="panel-export"
          role="tabpanel"
          aria-labelledby="tab-export"
          className="sidebar-tab-panel export-page-sidebar"
        >
          <ExportPage {...exportPage} />
        </div>
      )}
    </aside>
  );
  },
);
