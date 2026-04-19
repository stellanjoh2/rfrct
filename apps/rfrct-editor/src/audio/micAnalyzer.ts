/**
 * RMS envelope (0–1) from microphone or display/tab capture for refraction,
 * plus FFT band levels for VJ (bass / mid / high).
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

/** Smoothed 0–1 energy per rough musical band (FFT-derived). */
export type SpectralBands = {
  /** ~40–220 Hz — kick, sub. */
  bass: number;
  /** ~220–900 Hz. */
  lowMid: number;
  /** ~900–4000 Hz. */
  mid: number;
  /** ~4–14 kHz — hats, snare crack. */
  high: number;
};

export type MicTickResult = {
  /** Smoothed RMS-derived 0–1 (same as before for refraction). */
  envelope: number;
  /**
   * Loudness 0–1 from RMS → dBFS, mapped roughly −55…0 dB to 0…1 (smoothed).
   * Kept for legacy / blend; VJ prefers {@link MicTickResult.bands}.
   */
  dbNorm: number;
  /** Smoothed band levels 0–1. */
  bands: SpectralBands;
  /**
   * Frame-to-frame rise in raw band energy (0–1), scaled for transients.
   * Use for attacks: bass = big weight, high = snappy hits.
   */
  bandTransient: SpectralBands;
};

export const ZERO_SPECTRAL_BANDS: SpectralBands = {
  bass: 0,
  lowMid: 0,
  mid: 0,
  high: 0,
};

export const INACTIVE_MIC_TICK: MicTickResult = {
  envelope: 0,
  dbNorm: 0,
  bands: { ...ZERO_SPECTRAL_BANDS },
  bandTransient: { ...ZERO_SPECTRAL_BANDS },
};

/**
 * Scales FFT bands and transients by Audio boost (0–1) for VJ extras.
 * Refraction still applies boost inside {@link buildRendererSyncParams} from raw envelope.
 */
export function scaleTickForAudioBoost(
  tick: MicTickResult,
  boost: number,
): MicTickResult {
  const b = Math.max(0, Math.min(1, boost));
  if (b >= 1 - 1e-6) {
    return tick;
  }
  if (b <= 1e-6) {
    return {
      ...tick,
      envelope: tick.envelope * b,
      dbNorm: tick.dbNorm * b,
      bands: { ...ZERO_SPECTRAL_BANDS },
      bandTransient: { ...ZERO_SPECTRAL_BANDS },
    };
  }
  return {
    ...tick,
    envelope: tick.envelope * b,
    dbNorm: tick.dbNorm * b,
    bands: {
      bass: tick.bands.bass * b,
      lowMid: tick.bands.lowMid * b,
      mid: tick.bands.mid * b,
      high: tick.bands.high * b,
    },
    bandTransient: {
      bass: tick.bandTransient.bass * b,
      lowMid: tick.bandTransient.lowMid * b,
      mid: tick.bandTransient.mid * b,
      high: tick.bandTransient.high * b,
    },
  };
}

/** Hz band edges (inclusive/exclusive pairs in accumulateBand). */
const BAND_BASS: [number, number] = [40, 220];
const BAND_LOWMID: [number, number] = [220, 900];
const BAND_MID: [number, number] = [900, 4000];
const BAND_HIGH: [number, number] = [4000, 14000];

/** Scales average linear bin magnitude into ~0–1 after sqrt. */
const BAND_GAIN: SpectralBands = {
  bass: 14,
  lowMid: 12,
  mid: 11,
  high: 18,
};

/** Scale raw frame deltas into comparable 0–1 transient strengths. */
const TRANSIENT_SCALE: SpectralBands = {
  bass: 5.5,
  lowMid: 6,
  mid: 7,
  high: 9,
};

function accumulateBandNorm(
  freq: Float32Array,
  sampleRate: number,
  fftSize: number,
  fMin: number,
  fMax: number,
  gain: number,
): number {
  const hzPerBin = sampleRate / fftSize;
  const n = freq.length;
  const i0 = Math.max(0, Math.min(n - 1, Math.floor(fMin / hzPerBin)));
  const i1 = Math.max(i0 + 1, Math.min(n, Math.ceil(fMax / hzPerBin)));
  let sumLin = 0;
  let count = 0;
  for (let i = i0; i < i1; i++) {
    const db = freq[i];
    if (!Number.isFinite(db)) continue;
    const clamped = Math.max(-100, Math.min(0, db));
    sumLin += Math.pow(10, clamped / 20);
    count++;
  }
  if (count === 0) return 0;
  const avgLin = sumLin / count;
  return Math.min(1, Math.sqrt(avgLin * gain));
}

export class MicAnalyzer {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private timeData: Float32Array | null = null;
  private freqData: Float32Array | null = null;
  private smooth = 0;
  private dbNormSmooth = 0;
  private bandSmooth: SpectralBands = { ...ZERO_SPECTRAL_BANDS };
  private rawBandPrev: SpectralBands = { ...ZERO_SPECTRAL_BANDS };

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
    this.timeData = new Float32Array(analyser.fftSize);
    this.freqData = new Float32Array(analyser.frequencyBinCount);
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
    this.timeData = null;
    this.freqData = null;
    this.smooth = 0;
    this.dbNormSmooth = 0;
    this.bandSmooth = { ...ZERO_SPECTRAL_BANDS };
    this.rawBandPrev = { ...ZERO_SPECTRAL_BANDS };
  }

  /**
   * Call once per frame while active. RMS → envelope + dB loudness; FFT → spectral bands.
   */
  tick(): MicTickResult {
    const analyser = this.analyser;
    const timeData = this.timeData;
    const freqData = this.freqData;
    const ctx = this.ctx;
    if (!analyser || !timeData || !freqData || !ctx) {
      return { ...INACTIVE_MIC_TICK };
    }

    analyser.getFloatTimeDomainData(timeData);
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const x = timeData[i];
      sum += x * x;
    }
    const rms = Math.sqrt(sum / timeData.length);
    const raw = Math.min(1, rms * 14);
    this.smooth = this.smooth * 0.8 + raw * 0.2;

    const db = 20 * Math.log10(rms + 1e-10);
    const dbFloor = -55;
    const dbNormRaw = Math.min(1, Math.max(0, (db - dbFloor) / -dbFloor));
    this.dbNormSmooth = this.dbNormSmooth * 0.82 + dbNormRaw * 0.18;

    analyser.getFloatFrequencyData(freqData);
    const sr = ctx.sampleRate;
    const fftSize = analyser.fftSize;

    const rawBass = accumulateBandNorm(
      freqData,
      sr,
      fftSize,
      BAND_BASS[0],
      BAND_BASS[1],
      BAND_GAIN.bass,
    );
    const rawLowMid = accumulateBandNorm(
      freqData,
      sr,
      fftSize,
      BAND_LOWMID[0],
      BAND_LOWMID[1],
      BAND_GAIN.lowMid,
    );
    const rawMid = accumulateBandNorm(
      freqData,
      sr,
      fftSize,
      BAND_MID[0],
      BAND_MID[1],
      BAND_GAIN.mid,
    );
    const rawHigh = accumulateBandNorm(
      freqData,
      sr,
      fftSize,
      BAND_HIGH[0],
      BAND_HIGH[1],
      BAND_GAIN.high,
    );

    const trBass = Math.min(
      1,
      Math.max(0, rawBass - this.rawBandPrev.bass) * TRANSIENT_SCALE.bass,
    );
    const trLowMid = Math.min(
      1,
      Math.max(0, rawLowMid - this.rawBandPrev.lowMid) * TRANSIENT_SCALE.lowMid,
    );
    const trMid = Math.min(
      1,
      Math.max(0, rawMid - this.rawBandPrev.mid) * TRANSIENT_SCALE.mid,
    );
    const trHigh = Math.min(
      1,
      Math.max(0, rawHigh - this.rawBandPrev.high) * TRANSIENT_SCALE.high,
    );

    this.rawBandPrev = {
      bass: rawBass,
      lowMid: rawLowMid,
      mid: rawMid,
      high: rawHigh,
    };

    this.bandSmooth.bass = this.bandSmooth.bass * 0.82 + rawBass * 0.18;
    this.bandSmooth.lowMid = this.bandSmooth.lowMid * 0.82 + rawLowMid * 0.18;
    this.bandSmooth.mid = this.bandSmooth.mid * 0.82 + rawMid * 0.18;
    this.bandSmooth.high = this.bandSmooth.high * 0.82 + rawHigh * 0.18;

    return {
      envelope: this.smooth,
      dbNorm: this.dbNormSmooth,
      bands: {
        bass: this.bandSmooth.bass,
        lowMid: this.bandSmooth.lowMid,
        mid: this.bandSmooth.mid,
        high: this.bandSmooth.high,
      },
      bandTransient: {
        bass: trBass,
        lowMid: trLowMid,
        mid: trMid,
        high: trHigh,
      },
    };
  }
}
