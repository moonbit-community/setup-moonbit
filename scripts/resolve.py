#!/usr/bin/env python3
import hashlib
import os
import platform
import sys
import urllib.request
from typing import Optional, Tuple


ALIASES = {
    "stable": "latest",
    "bleeding": "nightly",
}


def die(message: str) -> None:
    print(f"error: {message}", file=sys.stderr)
    sys.exit(1)


def resolve_version(raw: str) -> str:
    raw = (raw or "").strip()
    if not raw:
        return "latest"
    return ALIASES.get(raw, raw)


def resolve_moon_home() -> str:
    moon_home = os.environ.get("MOON_HOME")
    if moon_home:
        return os.path.expanduser(moon_home)
    home = os.environ.get("HOME") or os.environ.get("USERPROFILE")
    if not home:
        die("HOME is not set")
    return os.path.join(home, ".moon")


def resolve_target(system: str, machine: str) -> Tuple[str, str]:
    if system == "Windows":
        arch = os.environ.get("PROCESSOR_ARCHITECTURE", machine)
        if arch.upper() != "AMD64":
            die(f"Unsupported platform: {arch}")
        target = "windows-x86_64"
        extension = "zip"
    elif system == "Linux":
        if machine != "x86_64":
            die(f"Unsupported platform: {system} {machine}")
        target = "linux-x86_64"
        extension = "tar.gz"
    elif system == "Darwin":
        if machine != "arm64":
            die(f"Unsupported platform: {system} {machine}")
        target = "darwin-aarch64"
        extension = "tar.gz"
    else:
        die(f"Unsupported platform: {system} {machine}")

    if os.environ.get("MOONBIT_INSTALL_DEV"):
        target = f"{target}-dev"
    return target, extension


def header_stamp(url: str) -> str:
    req = urllib.request.Request(url, method="HEAD")
    try:
        with urllib.request.urlopen(req) as resp:
            headers = resp.headers
            for key in ("ETag", "Last-Modified", "Content-Length"):
                value = headers.get(key)
                if value:
                    return value
    except Exception as exc:
        die(f"Failed to fetch headers for {url}: {exc}")
    return ""


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def write_kv(path: Optional[str], key: str, value: str) -> None:
    if not path:
        return
    with open(path, "a", encoding="utf-8") as handle:
        handle.write(f"{key}={value}\n")


def main() -> None:
    raw_version = os.environ.get("INPUT_VERSION", "")
    resolved_version = resolve_version(raw_version)
    version_encoded = resolved_version.replace("+", "%2B")

    system = platform.system()
    machine = platform.machine()
    target, extension = resolve_target(system, machine)

    moon_home = resolve_moon_home()
    moon_bin = os.path.join(moon_home, "bin")

    cli = "https://cli.moonbitlang.com"
    moonbit_uri = f"{cli}/binaries/{version_encoded}/moonbit-{target}.{extension}"
    core_uri = f"{cli}/cores/core-{version_encoded}.{extension}"

    moonbit_stamp = header_stamp(moonbit_uri) or version_encoded
    core_stamp = header_stamp(core_uri) or version_encoded

    cache_key = (
        f"moon-{target}-{version_encoded}-"
        f"{sha256_text(moonbit_stamp)}-{sha256_text(core_stamp)}"
    )

    outputs = {
        "MOONBIT_RESOLVED_VERSION": resolved_version,
        "MOONBIT_CACHE_KEY": cache_key,
        "MOONBIT_MOON_HOME": moon_home,
        "MOONBIT_MOON_BIN": moon_bin,
    }

    env_path = os.environ.get("GITHUB_ENV")
    out_path = os.environ.get("GITHUB_OUTPUT")
    for key, value in outputs.items():
        write_kv(env_path, key, value)
        write_kv(out_path, key, value)


if __name__ == "__main__":
    main()
