import { describe, it, expect } from "vitest";
import { formatDurationMs } from "./format";

describe("formatDurationMs", () => {
  it("secondes seules", () => {
    expect(formatDurationMs(5000)).toBe("5s");
  });
  it("minutes et secondes", () => {
    expect(formatDurationMs(12 * 60_000 + 34_000)).toBe("12 min 34 s");
  });
  it("complète les secondes à deux chiffres", () => {
    expect(formatDurationMs(2 * 60_000 + 3_000)).toBe("2 min 03 s");
  });
  it("heures et minutes", () => {
    expect(formatDurationMs(60 * 60_000 + 5 * 60_000)).toBe("1 h 05 min");
  });
});
