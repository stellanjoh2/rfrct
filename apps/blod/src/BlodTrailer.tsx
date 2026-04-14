import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { publicUrl } from "./publicUrl";
import { BLOD_TRAILER_MP4_URL } from "./trailerUrl";
/** Fixed viewport band for the trailer section — `public/Images/video-tile-bg.jpg`. */
const TRAILER_BG_IMAGE = publicUrl("Images/video-tile-bg.jpg");
/** Seek to start slightly before the file end to avoid native `loop` seam glitches. */
const LOOP_TAIL_SEC = 0.05;

export function BlodTrailer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const sync = () => setIsPlaying(!v.paused);
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);
    void v.play().catch(() => {});
    return () => {
      v.removeEventListener("play", sync);
      v.removeEventListener("pause", sync);
    };
  }, []);

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
    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlayback = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
    } else {
      v.pause();
    }
  }, []);

  return (
    <section
      id="trailer"
      className="blod-section blod-section--trailer"
      style={
        {
          "--blod-trailer-bg-image": `url(${TRAILER_BG_IMAGE})`,
        } as CSSProperties
      }
    >
      <div className="blod-section-inner blod-section-inner--prose blod-section-inner--trailer">
        <div className="blod-trailer">
          <div className="blod-trailer__frame">
            <div className="blod-trailer__media">
              <video
                ref={videoRef}
                className="blod-trailer__video"
                src={BLOD_TRAILER_MP4_URL}
                poster={TRAILER_BG_IMAGE}
                autoPlay
                muted
                playsInline
                preload="auto"
                onClick={togglePlayback}
              />
              <div className="blod-trailer__tint" aria-hidden />
            </div>
            <button
              type="button"
              className="blod-trailer__play"
              onClick={(e) => {
                e.stopPropagation();
                togglePlayback();
              }}
              aria-label={isPlaying ? "Pause teaser" : "Play teaser"}
            >
              <span className="blod-trailer__play-label">Play Teaser</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
