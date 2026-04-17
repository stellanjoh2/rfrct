/** Origins used by the nocookie embed player for postMessage targets. */
const YT_EMBED_ORIGINS = [
  "https://www.youtube-nocookie.com",
  "https://www.youtube.com",
] as const;

/** Commands accepted by the embedded player when enablejsapi=1 (see YouTube IFrame API). */
const COMMANDS: string[] = [
  JSON.stringify({ event: "command", func: "mute", args: "" }),
  JSON.stringify({ event: "command", func: "setVolume", args: [0] }),
];

/**
 * True when the iframe is not the initial same-origin `about:blank` document.
 * Until the YouTube URL loads, `contentWindow` is same-origin as the app, so
 * postMessage(..., 'https://www.youtube.com') fails (recipient origin is localhost).
 */
function isYoutubeEmbedBrowsingContextReady(iframe: HTMLIFrameElement): boolean {
  const src = iframe.getAttribute("src") ?? iframe.src;
  if (!src || !/youtube(-nocookie)?\.com\/embed\//i.test(src)) return false;
  try {
    const doc = iframe.contentDocument;
    if (doc == null) {
      /* Cross-origin embed — YouTube document (or no doc yet; skip if no window). */
      return iframe.contentWindow != null;
    }
    return !doc.URL.startsWith("about:");
  } catch {
    return true;
  }
}

/** Force mute + zero volume via postMessage (requires enablejsapi=1 on embed URL). */
export function postYoutubeMute(iframe: HTMLIFrameElement): void {
  if (!isYoutubeEmbedBrowsingContextReady(iframe)) return;
  const w = iframe.contentWindow;
  if (!w) return;
  for (const origin of YT_EMBED_ORIGINS) {
    for (const cmd of COMMANDS) {
      try {
        w.postMessage(cmd, origin);
      } catch {
        /* ignore */
      }
    }
  }
}
