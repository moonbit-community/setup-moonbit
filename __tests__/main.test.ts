import { describe, expect, test } from "@jest/globals";

import {
  getCacheKey,
  getMoonbitArchiveUrl,
  getTarget,
  normalizeVersion,
} from "../src/main.js";

describe("normalizeVersion", () => {
  test("maps compatibility aliases to moving channels", () => {
    expect(normalizeVersion("stable")).toBe("latest");
    expect(normalizeVersion("bleeding")).toBe("nightly");
  });

  test("keeps supported channel names unchanged", () => {
    expect(normalizeVersion("latest")).toBe("latest");
    expect(normalizeVersion("nightly")).toBe("nightly");
    expect(normalizeVersion("pre-release")).toBe("pre-release");
  });

  test("rejects unsupported versions", () => {
    expect(() => normalizeVersion("v1.0.0")).toThrow("unsupported version");
  });
});

describe("getTarget", () => {
  test("maps supported runner targets", () => {
    expect(getTarget("darwin", "arm64", false)).toBe("darwin-aarch64");
    expect(getTarget("linux", "arm64", false)).toBe("linux-aarch64");
    expect(getTarget("linux", "x64", false)).toBe("linux-x86_64");
    expect(getTarget("win32", "x64", false)).toBe("windows-x86_64");
    expect(getTarget("win32", "arm64", false)).toBe("windows-x86_64");
  });

  test("includes the dev suffix when requested", () => {
    expect(getTarget("linux", "x64", true)).toBe("linux-x86_64-dev");
  });

  test("rejects unsupported targets", () => {
    expect(() => getTarget("darwin", "x64", false)).toThrow(
      "unsupported platform",
    );
  });
});

describe("getMoonbitArchiveUrl", () => {
  test("uses the platform archive extension", () => {
    expect(getMoonbitArchiveUrl("latest", "linux-x86_64")).toContain(".tar.gz");
    expect(getMoonbitArchiveUrl("latest", "windows-x86_64")).toContain(".zip");
  });
});

describe("getCacheKey", () => {
  test("stays stable for the same checksum", () => {
    const first = getCacheKey(
      "linux-x86_64",
      "latest",
      "8a2c6907886d25af32cbbb81ac368a4df09bac65d702caad98db100a470b8308",
    );
    const second = getCacheKey(
      "linux-x86_64",
      "latest",
      "8a2c6907886d25af32cbbb81ac368a4df09bac65d702caad98db100a470b8308",
    );

    expect(first).toBe(second);
    expect(first).toMatch(/^linux-x86_64-latest-/);
  });

  test("changes when upstream checksum changes", () => {
    const original = getCacheKey(
      "linux-x86_64",
      "latest",
      "8a2c6907886d25af32cbbb81ac368a4df09bac65d702caad98db100a470b8308",
    );
    const changed = getCacheKey(
      "linux-x86_64",
      "latest",
      "0a2c6907886d25af32cbbb81ac368a4df09bac65d702caad98db100a470b8308",
    );

    expect(changed).not.toBe(original);
  });
});
