import * as cache from "@actions/cache";
import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as path from "node:path";

const cliMoonbit = "https://cli.moonbitlang.com";
const platform = core.platform.platform;
const arch = core.platform.arch;

type MoonbitVersion = "latest" | "nightly" | "pre-release";
type MoonbitInputVersion =
  | "latest"
  | "nightly"
  | "pre-release"
  | "stable"
  | "bleeding";
type BaseMoonbitTarget =
  | "darwin-aarch64"
  | "linux-aarch64"
  | "linux-x86_64"
  | "windows-x86_64";
type MoonbitTarget = BaseMoonbitTarget | `${BaseMoonbitTarget}-dev`;

const windowsInstallVersionEnvVar = "MOONBIT_INSTALL_VERSION";
const moonHomePath = path.join(getHomePath(), ".moon");
const moonBinPath = path.join(moonHomePath, "bin");

function getHomePath(): string {
  const home = process.env["HOME"] ?? process.env["USERPROFILE"];
  if (home) {
    return home;
  }

  switch (platform) {
    case "linux":
      return "/home/runner";
    case "win32":
      return "C:\\Users\\runneradmin";
    case "darwin":
      return "/Users/runner";
    default:
      throw Error(`unsupported platform: ${platform}`);
  }
}

function normalizeVersion(input: string): MoonbitVersion {
  switch (input as MoonbitInputVersion) {
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
}

function getVersion(): MoonbitVersion {
  return normalizeVersion(core.getInput("version"));
}

function getBaseTarget(
  platform: NodeJS.Platform,
  arch: string,
): BaseMoonbitTarget {
  switch (platform) {
    case "darwin":
      if (arch === "arm64") {
        return "darwin-aarch64";
      }
      break;
    case "linux":
      if (arch === "arm64") {
        return "linux-aarch64";
      }
      if (arch === "x64") {
        return "linux-x86_64";
      }
      break;
    case "win32":
      if (arch === "x64" || arch === "arm64") {
        return "windows-x86_64";
      }
      break;
  }

  throw Error(`unsupported platform: ${platform} ${arch}`);
}

function getTarget(
  platform: NodeJS.Platform,
  arch: string,
  installDev = Boolean(process.env["MOONBIT_INSTALL_DEV"]),
): MoonbitTarget {
  const target = getBaseTarget(platform, arch);
  return installDev ? `${target}-dev` : target;
}

function getMoonbitArchiveUrl(
  version: MoonbitVersion,
  target: MoonbitTarget,
): string {
  const archiveExtension = target.startsWith("windows-") ? "zip" : "tar.gz";
  return `${cliMoonbit}/binaries/${encodeURIComponent(version)}/moonbit-${target}.${archiveExtension}`;
}

async function fetchSha256(url: string): Promise<string> {
  const checksumUrl = `${url}.sha256`;
  const response = await fetch(checksumUrl);
  if (!response.ok) {
    throw Error(`failed to fetch ${checksumUrl}: ${response.status}`);
  }

  const [sha256 = ""] = (await response.text()).trim().split(/\s+/, 1);
  if (!/^[0-9a-fA-F]{64}$/.test(sha256)) {
    throw Error(`invalid sha256 in ${checksumUrl}`);
  }

  return sha256.toLowerCase();
}

function getCacheKey(
  target: MoonbitTarget,
  version: MoonbitVersion,
  moonbitSha256: string,
): string {
  return `${target}-${version}-${moonbitSha256}`;
}

async function tryGetCacheKey(
  version: MoonbitVersion,
  target: MoonbitTarget,
): Promise<string | undefined> {
  try {
    const moonbitArchiveUrl = getMoonbitArchiveUrl(version, target);
    const moonbitSha256 = await fetchSha256(moonbitArchiveUrl);
    return getCacheKey(target, version, moonbitSha256);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.warning(
      `skipping cache because upstream checksum could not be resolved: ${message}`,
    );
    return undefined;
  }
}

async function installMoonbit(version: MoonbitVersion): Promise<void> {
  if (platform === "win32") {
    core.exportVariable(windowsInstallVersionEnvVar, version);
    await exec("pwsh", [
      "-c",
      `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser; irm ${cliMoonbit}/install/powershell.ps1 | iex`,
    ]);
    return;
  }

  await exec("bash", [
    "-c",
    `curl -fsSL ${cliMoonbit}/install/unix.sh | bash -s ${version}`,
  ]);
}

export async function run(): Promise<void> {
  try {
    const version = getVersion();
    const target = getTarget(platform, arch);

    if (platform === "win32") {
      await installMoonbit(version);
    } else {
      const key = await tryGetCacheKey(version, target);
      if (key === undefined) {
        await installMoonbit(version);
      } else {
        const cacheHit = await cache.restoreCache([moonHomePath], key);
        if (cacheHit === undefined) {
          core.info("cache miss");
          await installMoonbit(version);
          await cache.saveCache([moonHomePath], key);
        } else {
          core.info("cache hit");
        }
      }
    }

    core.addPath(moonBinPath);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

export { getCacheKey, getMoonbitArchiveUrl, getTarget, normalizeVersion };
