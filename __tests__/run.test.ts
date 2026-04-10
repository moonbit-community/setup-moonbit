import { afterEach, describe, expect, jest, test } from "@jest/globals";

const originalFetch = global.fetch;
const checksum =
  "8a2c6907886d25af32cbbb81ac368a4df09bac65d702caad98db100a470b8308";

type LoadOptions = {
  arch?: string;
  cacheFeatureAvailable?: boolean;
  fetchOk?: boolean;
  fetchStatus?: number;
  fetchText?: string;
  home?: string;
  platform?: NodeJS.Platform;
  restoreCacheError?: Error;
  restoreCacheHit?: string;
  saveCacheError?: Error;
  version?: string;
};

async function loadMainModule(options: LoadOptions = {}) {
  jest.resetModules();

  const addPath = jest.fn();
  const exec = jest.fn(async () => 0);
  const getInput = jest.fn((name: string) =>
    name === "version" ? (options.version ?? "latest") : "",
  );
  const info = jest.fn();
  const isFeatureAvailable = jest.fn(
    () => options.cacheFeatureAvailable ?? true,
  );
  const restoreCache = jest.fn(async () => {
    if (options.restoreCacheError) {
      throw options.restoreCacheError;
    }

    return options.restoreCacheHit;
  });
  const saveCache = jest.fn(async () => {
    if (options.saveCacheError) {
      throw options.saveCacheError;
    }

    return 1;
  });
  const setFailed = jest.fn();
  const warning = jest.fn();
  const mockedHomedir = jest.fn(() => options.home ?? "/tmp/moon-home");
  const fetchMock = jest.fn(
    async () =>
      ({
        ok: options.fetchOk ?? true,
        status: (options.fetchOk ?? true) ? 200 : (options.fetchStatus ?? 500),
        text: async () => options.fetchText ?? checksum,
      }) as Response,
  );

  global.fetch = fetchMock as unknown as typeof fetch;

  jest.unstable_mockModule("@actions/cache", () => ({
    isFeatureAvailable,
    restoreCache,
    saveCache,
  }));
  jest.unstable_mockModule("@actions/core", () => ({
    addPath,
    getInput,
    info,
    platform: {
      arch: options.arch ?? "x64",
      platform: options.platform ?? "linux",
    },
    setFailed,
    warning,
  }));
  jest.unstable_mockModule("@actions/exec", () => ({
    exec,
  }));
  jest.unstable_mockModule("node:os", () => ({
    homedir: mockedHomedir,
  }));

  const main = await import("../src/main.js");

  return {
    main,
    mocks: {
      addPath,
      exec,
      fetch: fetchMock,
      getInput,
      info,
      isFeatureAvailable,
      mockedHomedir,
      restoreCache,
      saveCache,
      setFailed,
      warning,
    },
  };
}

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

describe("run", () => {
  test("installs without cache when the cache service is unavailable", async () => {
    const { main, mocks } = await loadMainModule({
      cacheFeatureAvailable: false,
    });

    await main.run();

    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.restoreCache).not.toHaveBeenCalled();
    expect(mocks.saveCache).not.toHaveBeenCalled();
    expect(mocks.info).toHaveBeenCalledWith("cache service unavailable");
    expect(mocks.exec).toHaveBeenCalledWith("bash", [
      "-c",
      "curl -fsSL https://cli.moonbitlang.com/install/unix.sh | bash -s latest",
    ]);
    expect(mocks.addPath).toHaveBeenCalledWith("/tmp/moon-home/.moon/bin");
    expect(mocks.setFailed).not.toHaveBeenCalled();
  });

  test("warns and installs when cache restore fails", async () => {
    const { main, mocks } = await loadMainModule({
      restoreCacheError: Error("restore failed"),
    });

    await main.run();

    expect(mocks.warning).toHaveBeenCalledWith(
      "cache restore failed: restore failed",
    );
    expect(mocks.saveCache).not.toHaveBeenCalled();
    expect(mocks.exec).toHaveBeenCalledTimes(1);
    expect(mocks.setFailed).not.toHaveBeenCalled();
  });

  test("warns but still succeeds when cache save fails", async () => {
    const { main, mocks } = await loadMainModule({
      saveCacheError: Error("save failed"),
    });

    await main.run();

    expect(mocks.warning).toHaveBeenCalledWith(
      "cache save failed: save failed",
    );
    expect(mocks.exec).toHaveBeenCalledTimes(1);
    expect(mocks.setFailed).not.toHaveBeenCalled();
  });

  test("passes the version env var to the windows installer", async () => {
    const { main, mocks } = await loadMainModule({
      arch: "arm64",
      platform: "win32",
      version: "nightly",
    });

    await main.run();

    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.restoreCache).not.toHaveBeenCalled();
    expect(mocks.exec).toHaveBeenCalledWith(
      "pwsh",
      [
        "-c",
        "Set-ExecutionPolicy RemoteSigned -Scope CurrentUser; irm https://cli.moonbitlang.com/install/powershell.ps1 | iex",
      ],
      {
        env: expect.objectContaining({
          MOONBIT_INSTALL_VERSION: "nightly",
        }),
      },
    );
  });
});
