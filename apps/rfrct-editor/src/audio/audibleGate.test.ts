import { describe, expect, it } from "vitest";
import { AUDIBLE_DB_NORM_MIN } from "./audibleGate";

describe("audibleGate", () => {
  it("exports a stable loudness floor for VJ gating", () => {
    expect(AUDIBLE_DB_NORM_MIN).toBeGreaterThan(0);
    expect(AUDIBLE_DB_NORM_MIN).toBeLessThan(1);
    expect(AUDIBLE_DB_NORM_MIN).toBe(0.032);
  });
});
