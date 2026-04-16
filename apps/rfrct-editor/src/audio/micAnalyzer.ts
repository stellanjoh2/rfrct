/**
 * RMS envelope (0–1) from microphone or display/tab capture for refraction.
 * Requires a secure context (HTTPS or localhost).
 */

/** `mic` = getUserMedia · `display` = getDisplayMedia (tab/window/screen — enable “share audio”). */
export type AudioInputMode = "mic" | "display";

/** User-facing message for getUserMedia failures. */
export function micStartErrorMessage(err: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "Microphone needs a secure page (https:// or localhost).";
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return "This browser does not support microphone input.";
  }
  const name = err instanceof DOMException ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Microphone permission was blocked. Allow access in the site settings or address bar.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No microphone was found.";
    case "NotReadableError":
    case "TrackStartError":
      return "Microphone is in use by another app or could not be opened.";
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return "Microphone does not support the requested audio settings.";
    case "SecurityError":
      return "Microphone is blocked (secure context required). Use https:// or localhost.";
    case "AbortError":
      return "Microphone access was interrupted.";
    default:
      return "Microphone unavailable or permission denied.";
  }
}

/** User-facing message for getDisplayMedia (tab / window / screen) failures. */
export function displayMediaErrorMessage(err: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "Audio capture needs a secure page (https:// or localhost).";
  }
  if (!navigator.mediaDevices?.getDisplayMedia) {
    return "This browser does not support tab or screen audio capture.";
  }
  const name = err instanceof DOMException ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Screen or tab share was cancelled or blocked.";
    case "NotFoundError":
      return "No audio in the capture. When sharing a tab, turn on “Share audio”. Some windows/screens have no system audio.";
    case "InvalidStateError":
      return "Could not start display capture.";
    case "AbortError":
      return "Display capture was interrupted.";
    case "NotSupportedError":
      return "Display audio capture is not supported here.";
    case "SecurityError":
      return "Display capture is blocked (secure context required).";
    default:
      return "Could not capture tab or system audio.";
  }
}

export function audioCaptureErrorMessage(
  mode: AudioInputMode,
  err: unknown,
): string {
  return mode === "display"
    ? displayMediaErrorMessage(err)
    : micStartErrorMessage(err);
}

export type MicTickResult = {
  /** Smoothed RMS-derived 0–1 (same as before for refraction). */
  envelope: number;
  /**
   * Loudness 0–1 from RMS → dBFS, mapped roughly −55…0 dB to 0…1 (smoothed).
   * Use for VJ / venue automation.
   */
  dbNorm: number;
};

export class MicAnalyzer {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private data: Float32Array | null = null;
  private smooth = 0;
  private dbNormSmooth = 0;

  async start(mode: AudioInputMode = "mic"): Promise<void> {
    this.stop();
    if (mode === "mic") {
      await this.openMicStream();
    } else {
      await this.openDisplayAudioStream();
    }
  }

  private async openMicStream(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    await this.attachStream(stream);
  }

  /**
   * Uses screen/tab/window picker. For **Chrome tab**, check “Share tab audio”.
   * That path is usually lower latency than room mic. True OS loopback is not exposed on the web.
   */
  private async openDisplayAudioStream(): Promise<void> {
    if (!window.isSecureContext) {
      throw new DOMException("insecure", "SecurityError");
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new DOMException("no getDisplayMedia", "NotSupportedError");
    }
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });

    if (stream.getAudioTracks().length === 0) {
      stream.getTracks().forEach((t) => t.stop());
      throw new DOMException("no audio track", "NotFoundError");
    }

    const audioLive = stream.getAudioTracks().filter((t) => t.readyState === "live");
    if (audioLive.length === 0) {
      stream.getTracks().forEach((t) => t.stop());
      throw new DOMException("audio ended", "AbortError");
    }

    await this.attachStream(stream);

    // Stop video tracks only after the stream is wired into Web Audio. Stopping them
    // immediately after getDisplayMedia can invalidate Chrome’s internal capture URL and
    // spam ERR_FILE_NOT_FOUND in the console (video is unused; we only need audio).
    queueMicrotask(() => {
      for (const t of stream.getVideoTracks()) {
        t.stop();
      }
    });
  }

  private async attachStream(stream: MediaStream): Promise<void> {
    this.stream = stream;
    const ctx = new AudioContext();
    this.ctx = ctx;
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.55;
    src.connect(analyser);
    this.analyser = analyser;
    this.data = new Float32Array(analyser.fftSize);
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    const c = this.ctx;
    this.ctx = null;
    if (c) {
      void c.close();
    }
    this.analyser = null;
    this.data = null;
    this.smooth = 0;
    this.dbNormSmooth = 0;
  }

  /**
   * Call once per frame while active. RMS → envelope + dB-scaled loudness for VJ.
   */
  tick(): MicTickResult {
    const analyser = this.analyser;
    const data = this.data;
    if (!analyser || !data) {
      return { envelope: 0, dbNorm: 0 };
    }
    analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const x = data[i];
      sum += x * x;
    }
    const rms = Math.sqrt(sum / data.length);
    const raw = Math.min(1, rms * 14);
    this.smooth = this.smooth * 0.8 + raw * 0.2;

    const db = 20 * Math.log10(rms + 1e-10);
    const dbFloor = -55;
    const dbNormRaw = Math.min(1, Math.max(0, (db - dbFloor) / -dbFloor));
    this.dbNormSmooth = this.dbNormSmooth * 0.82 + dbNormRaw * 0.18;

    return { envelope: this.smooth, dbNorm: this.dbNormSmooth };
  }
}
