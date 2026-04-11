import { useEffect, useRef } from "react";
import { BLOD_TRAILER_MP4_URL } from "./trailerUrl";

/** Seek to start slightly before the file end to avoid native `loop` seam glitches. */
const LOOP_TAIL_SEC = 0.05;

/**
 * Full-viewport muted teaser behind the WebGL hero (DOM order under `.blod-hero__gl`).
 * Composites through transparent canvas pixels; GPU draws flash underlay then SVG on top.
 */
export function BlodHeroTeaserVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const restartFromZero = () => {
      if ("fastSeek" in v && typeof v.fastSeek === "function") {
        try {
          v.fastSeek(0);
        } catch {
          v.currentTime = 0;
        }
      } else {
        v.currentTime = 0;
      }
      void v.play().catch(() => {});
    };

    const onTimeUpdate = () => {
      if (v.paused || !v.duration || !Number.isFinite(v.duration)) return;
      if (v.currentTime >= v.duration - LOOP_TAIL_SEC) {
        restartFromZero();
      }
    };

    const onEnded = () => {
      restartFromZero();
    };

    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("ended", onEnded);
    void v.play().catch(() => {});

    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("ended", onEnded);
    };
  }, []);

  return (
    <div className="blod-hero-teaser-stack">
      <div className="blod-hero-teaser-stack__column">
        <video
          ref={videoRef}
          className="blod-hero-teaser-video"
          src={BLOD_TRAILER_MP4_URL}
          autoPlay
          muted
          playsInline
          preload="auto"
          aria-hidden
        />
      </div>
    </div>
  );
}
