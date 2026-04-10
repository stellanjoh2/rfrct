/** Extract a YouTube video id from a watch URL, youtu.be, embed, shorts, or raw 11-char id. */
export function parseYoutubeVideoId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) {
    return s;
  }
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0] ?? "";
      if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return id;
    }
    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      const v = u.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const embed = u.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embed) return embed[1];
      const shorts = u.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shorts) return shorts[1];
    }
  } catch {
    /* ignore */
  }
  return null;
}

export type YoutubeEmbedOptions = {
  /** Parent page origin — recommended with `enablejsapi` for postMessage control. */
  pageOrigin?: string;
};

/**
 * iframe src: always starts muted (`mute=1`); `enablejsapi=1` allows postMessage mute
 * so audio cannot stay unmuted if the player state changes.
 */
export function buildYoutubeEmbedSrc(
  videoId: string,
  options?: YoutubeEmbedOptions,
): string {
  const q = new URLSearchParams({
    autoplay: "1",
    /** Required for autoplay in most browsers; never rely on sound. */
    mute: "1",
    controls: "0",
    loop: "1",
    playlist: videoId,
    playsinline: "1",
    modestbranding: "1",
    rel: "0",
    disablekb: "1",
    enablejsapi: "1",
  });
  if (options?.pageOrigin) {
    q.set("origin", options.pageOrigin);
  }
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${q.toString()}`;
}
