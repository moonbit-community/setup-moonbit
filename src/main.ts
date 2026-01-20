import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as cache from "@actions/cache";
import * as path from "node:path";
import { info, warning } from "@actions/core";

enum Github_HOME_PATH {
  Linux = "/home/runner",
  Windows = "C:\\Users\\runneradmin",
  Darwin = "/Users/runner",
}
const platform = core.platform.platform;
const arch = core.platform.arch;

const get_home_path = () => {
  switch (platform) {
    case "linux":
      return Github_HOME_PATH.Linux;
    case "win32":
      return Github_HOME_PATH.Windows;
    case "darwin":
      return Github_HOME_PATH.Darwin;
    default:
      throw Error("support os");
  }
};
const home_path = get_home_path();

const moon_home_path = path.join(home_path, ".moon");

const moon_bin_path = path.join(moon_home_path, "bin");

type moonbit_version = "latest" | "nightly" | "pre-release";
type moonbit_input_version =
  | "latest"
  | "nightly"
  | "pre-release"
  // Backward-compatible aliases
  | "stable"
  | "bleeding";

const WindowInstallVersionEnvVar = "MOONBIT_INSTALL_VERSION";

type moonbit_installer_version = "stable" | "bleeding" | "pre-release";

const to_installer_version = (
  version: moonbit_version,
): moonbit_installer_version => {
  switch (version) {
    case "latest":
      return "stable";
    case "nightly":
      return "bleeding";
    case "pre-release":
      return "pre-release";
  }
};

const install_moonbit = async (version: moonbit_version) => {
  const installer_version = to_installer_version(version);
  if (platform === "win32") {
    core.exportVariable(WindowInstallVersionEnvVar, installer_version);
    await exec("pwsh", [
      "-c",
      `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser; irm https://cli.moonbitlang.com/install/powershell.ps1 | iex`,
    ]);
  } else {
    await exec(`bash`, [
      `-c`,
      `curl -fsSL https://cli.moonbitlang.com/install/unix.sh | bash -s ${installer_version}`,
    ]);
  }
};

const get_version = (): moonbit_version => {
  const input = core.getInput("version");
  switch (input as moonbit_input_version) {
    case "latest":
    case "stable":
      return "latest";
    case "nightly":
    case "bleeding":
      return "nightly";
    case "pre-release":
      return "pre-release";
    default:
      throw Error(`unsupported version: ${input}`);
  }
};

const now = new Date();
const year = now.getUTCFullYear();
const month = now.getUTCMonth();
const day = now.getUTCDate();
const week_of_month = Math.trunc(day / 7) + 1;

const get_key = (version: moonbit_version) => {
  if (version === "nightly") {
    return `${platform}-${arch}-${version}-${year}-${month}-${day}`;
  } else {
    return `${platform}-${arch}-${version}-${year}-${month}-${week_of_month}`;
  }
};

export async function run(): Promise<void> {
  try {
    const version = get_version();
    if (platform !== "win32") {
      const key = get_key(version);
      const cache_path = moon_home_path;
      const is_cache = await cache.restoreCache([cache_path], key);
      if (is_cache === undefined) {
        info("cache miss");
        await install_moonbit(version);
        await cache.saveCache([cache_path], key);
      } else {
        info("cache hit");
      }
    } else {
      await install_moonbit(version);
    }

    core.addPath(moon_bin_path);
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}
