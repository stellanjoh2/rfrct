import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import {
  Export as ExportIcon,
  GearSix,
  Sparkle,
  Waveform,
} from "@phosphor-icons/react";
import { AppearanceSection } from "./AppearanceSection";
import { BackdropSection } from "./BackdropSection";
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
import type { BackdropSectionProps } from "./BackdropSection";
import { SecondaryLayerSection } from "./SecondaryLayerSection";
import type { SecondaryLayerSectionProps } from "./SecondaryLayerSection";
import { TertiaryLayerSection } from "./TertiaryLayerSection";
import type { TertiaryLayerSectionProps } from "./TertiaryLayerSection";
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
import { TemplatesSection } from "./TemplatesSection";
import type { TemplatesSectionProps } from "./TemplatesSection";

export type SettingsSidebarProps = {
  /** Extra class names on the root aside (e.g. startup fade). */
  className?: string;
  uiVisible: boolean;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  layer1FileName: string | null;
  onRemoveLayer1: () => void;
  appearance: AppearanceSectionProps;
  backdrop: BackdropSectionProps;
  secondaryLayer: SecondaryLayerSectionProps;
  tertiaryLayer: TertiaryLayerSectionProps;
  lens: LensSectionProps;
  dupStack: DupStackSectionProps;
  bloom: BloomSectionProps;
  effects: EffectsSectionProps;
  audio: AudioSectionProps;
  videoBackdrop: VideoBackdropSectionProps;
  mouseInput: MouseInputSectionProps;
  shareSettings: ShareSettingsSectionProps;
  exportPage: ExportPageProps;
  templates: TemplatesSectionProps;
};

export const SettingsSidebar = forwardRef<HTMLElement, SettingsSidebarProps>(
  function SettingsSidebar(
    {
      className,
      uiVisible,
      onFile,
      layer1FileName,
      onRemoveLayer1,
      appearance,
      backdrop,
      secondaryLayer,
      tertiaryLayer,
      lens,
      dupStack,
      bloom,
      effects,
      audio,
      videoBackdrop,
      mouseInput,
      shareSettings,
      exportPage,
      templates,
    },
    ref,
  ) {
  const [activeTab, setActiveTab] = useState<"design" | "vj" | "export" | "settings">(
    "design",
  );
  const [scrollbarActive, setScrollbarActive] = useState(false);
  const [scrollThumb, setScrollThumb] = useState({ top: 0, height: 0, offsetTop: 0 });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollHideTimerRef = useRef<number | null>(null);

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

  const syncScrollThumb = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight <= clientHeight + 1) {
      setScrollThumb({ top: 0, height: 0, offsetTop: el.offsetTop });
      return;
    }
    const thumbHeight = Math.max(
      28,
      Math.round((clientHeight * clientHeight) / scrollHeight),
    );
    const maxTop = Math.max(0, clientHeight - thumbHeight);
    const top =
      maxTop <= 0
        ? 0
        : Math.round((scrollTop / (scrollHeight - clientHeight)) * maxTop);
    setScrollThumb({ top, height: thumbHeight, offsetTop: el.offsetTop });
  }, []);

  const activateScrollbar = useCallback(() => {
    setScrollbarActive(true);
    if (scrollHideTimerRef.current !== null) {
      window.clearTimeout(scrollHideTimerRef.current);
    }
    scrollHideTimerRef.current = window.setTimeout(() => {
      setScrollbarActive(false);
      scrollHideTimerRef.current = null;
    }, 780);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      syncScrollThumb();
    });
    ro.observe(el);
    syncScrollThumb();
    return () => {
      ro.disconnect();
      if (scrollHideTimerRef.current !== null) {
        window.clearTimeout(scrollHideTimerRef.current);
      }
    };
  }, [syncScrollThumb]);

  return (
    <aside
      ref={ref}
      className={[
        "glass-sidebar",
        "panel",
        uiVisible ? "" : "glass-sidebar--hidden",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!uiVisible}
      aria-label="Settings"
      onPointerDownCapture={(e) => {
        const t = e.target as HTMLElement;
        if (t.matches("input[type=\"range\"]")) {
          t.closest(".field")?.classList.add("field--range-dragging");
        }
      }}
    >
      <header className="sidebar-header">
        <div className="sidebar-tabs" role="tablist" aria-label="Editor modes">
          <button
            type="button"
            role="tab"
            id="tab-design"
            aria-selected={activeTab === "design"}
            aria-controls="panel-design"
            className={`sidebar-tab ${activeTab === "design" ? "sidebar-tab--active" : ""}`}
            onClick={() => setActiveTab("design")}
            title="Design"
            aria-label="Design"
          >
            <Sparkle aria-hidden size={20} weight="fill" />
          </button>
          <button
            type="button"
            role="tab"
            id="tab-vj"
            aria-selected={activeTab === "vj"}
            aria-controls="panel-vj"
            className={`sidebar-tab ${activeTab === "vj" ? "sidebar-tab--active" : ""}`}
            onClick={() => setActiveTab("vj")}
            title="VJ"
            aria-label="VJ"
          >
            <Waveform aria-hidden size={20} weight="duotone" />
          </button>
          <button
            type="button"
            role="tab"
            id="tab-export"
            aria-selected={activeTab === "export"}
            aria-controls="panel-export"
            className={`sidebar-tab ${activeTab === "export" ? "sidebar-tab--active" : ""}`}
            onClick={() => setActiveTab("export")}
            title="Export"
            aria-label="Export"
          >
            <ExportIcon aria-hidden size={20} weight="duotone" />
          </button>
          <button
            type="button"
            role="tab"
            id="tab-settings"
            aria-selected={activeTab === "settings"}
            aria-controls="panel-settings"
            className={`sidebar-tab ${activeTab === "settings" ? "sidebar-tab--active" : ""}`}
            onClick={() => setActiveTab("settings")}
            title="Settings"
            aria-label="Settings"
          >
            <GearSix aria-hidden size={20} weight="duotone" />
          </button>
        </div>
      </header>
      <div
        ref={scrollRef}
        className={`sidebar-scroll ${scrollbarActive ? "sidebar-scroll--active" : ""}`}
        onScroll={() => {
          syncScrollThumb();
          activateScrollbar();
        }}
      >
        <div className="sidebar-scroll-content">
          {activeTab === "design" ? (
            <div
              id="panel-design"
              role="tabpanel"
              aria-labelledby="tab-design"
              className="sidebar-tab-panel"
            >
              <div className="sidebar-panel-body">
                <h2 className="sidebar-page-title">Design</h2>
                <TemplatesSection {...templates} />
                <BackdropSection {...backdrop} />
                <VideoBackdropSection {...videoBackdrop} />
                <h2 title="Primary artwork upload, scale, and color">
                  Layer 1
                </h2>
                <UploadBlock
                  onFile={onFile}
                  fileName={layer1FileName}
                  onRemoveFile={onRemoveLayer1}
                />
                <AppearanceSection {...appearance} />
                <SecondaryLayerSection {...secondaryLayer} />
                <TertiaryLayerSection {...tertiaryLayer} />
                <LensSection {...lens} />
                <BloomSection {...bloom} />
                <EffectsSection {...effects} />
                <DupStackSection {...dupStack} />
                <MouseInputSection {...mouseInput} />
                <ShareSettingsSection {...shareSettings} />
              </div>
            </div>
          ) : activeTab === "vj" ? (
            <div
              id="panel-vj"
              role="tabpanel"
              aria-labelledby="tab-vj"
              className="sidebar-tab-panel"
            >
              <div className="sidebar-panel-body">
                <h2 className="sidebar-page-title">VJ</h2>
                <AudioSection {...audio} />
              </div>
            </div>
          ) : activeTab === "export" ? (
            <div
              id="panel-export"
              role="tabpanel"
              aria-labelledby="tab-export"
              className="sidebar-tab-panel"
            >
              <div className="sidebar-panel-body">
                <h2 className="sidebar-page-title">Export</h2>
                <ExportPage {...exportPage} />
              </div>
            </div>
          ) : (
            <div
              id="panel-settings"
              role="tabpanel"
              aria-labelledby="tab-settings"
              className="sidebar-tab-panel"
            >
              <div className="sidebar-panel-body">
                <h2 className="sidebar-page-title">Settings</h2>
                <section>
                  <p className="field-hint">
                    Global app settings will live here soon. The tab is ready for future controls.
                  </p>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
      <div
        className={`sidebar-scroll-thumb${
          scrollbarActive && scrollThumb.height > 0
            ? " sidebar-scroll-thumb--active"
            : ""
        }`}
        style={{
          top: `${scrollThumb.offsetTop}px`,
          height: `${scrollThumb.height}px`,
          transform: `translateY(${scrollThumb.top}px)`,
        }}
        aria-hidden
      />
    </aside>
  );
  },
);
