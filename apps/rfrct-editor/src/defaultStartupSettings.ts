import { parseSettingsSnapshot } from "./settingsSnapshot";
import type { RfrctEditorSettingsSnapshotV1 } from "./settingsSnapshot";
import raw from "./defaultStartupSettings.json";

const parsed = parseSettingsSnapshot(JSON.stringify(raw));
if (!parsed.ok) {
  throw new Error(`defaultStartupSettings.json: ${parsed.error}`);
}

/** Parsed defaults bundled at build time — used for first paint and Copy settings baseline. */
export const DEFAULT_STARTUP_SETTINGS_V1: RfrctEditorSettingsSnapshotV1 =
  parsed.data;
