import { describe, expect, it } from "vitest";
import { DESIGN_TEMPLATES } from "./designTemplates";
import {
  createSettingsSnapshot,
  parseSettingsSnapshot,
  serializeSettingsSnapshot,
  SETTINGS_SNAPSHOT_SCHEMA,
  SETTINGS_SNAPSHOT_VERSION,
} from "./settingsSnapshot";
import type { RfrctEditorSettingsSnapshotV1 } from "./settingsSnapshot";

describe("parseSettingsSnapshot", () => {
  it("parses bundled Acid design template", () => {
    const raw = serializeSettingsSnapshot(DESIGN_TEMPLATES[0].snapshot);
    const r = parseSettingsSnapshot(raw);
    expect(r.ok).toBe(true);
  });

  it("round-trips serialize → parse for Acid template data", () => {
    const data: RfrctEditorSettingsSnapshotV1 = DESIGN_TEMPLATES[0].snapshot;
    const again = parseSettingsSnapshot(serializeSettingsSnapshot(data));
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.data).toEqual(data);
  });

  it("rejects wrong schema", () => {
    const r = parseSettingsSnapshot(
      JSON.stringify({ schema: "other", version: 1 }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/schema/i);
  });
});

describe("createSettingsSnapshot", () => {
  it("adds schema and version", () => {
    const { schema: _s, version: _v, ...rest } = DESIGN_TEMPLATES[0].snapshot;
    const s = createSettingsSnapshot(rest);
    expect(s.schema).toBe(SETTINGS_SNAPSHOT_SCHEMA);
    expect(s.version).toBe(SETTINGS_SNAPSHOT_VERSION);
  });
});
