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

/** Force mute + zero volume via postMessage (requires enablejsapi=1 on embed URL). */
export function postYoutubeMute(iframe: HTMLIFrameElement): void {
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
