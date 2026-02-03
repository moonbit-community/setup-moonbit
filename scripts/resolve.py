#!/usr/bin/env python3
import os
import platform
import sys
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


def write_kv(path: Optional[str], key: str, value: str) -> None:
    if not path:
        return
    with open(path, "a", encoding="utf-8") as handle:
        handle.write(f"{key}={value}\n")


def main() -> None:
    raw_version = os.environ.get("INPUT_VERSION", "")
    resolved_version = resolve_version(raw_version)

    system = platform.system()
    machine = platform.machine()
    resolve_target(system, machine)

    moon_home = resolve_moon_home()
    moon_bin = os.path.join(moon_home, "bin")

    outputs = {
        "MOONBIT_RESOLVED_VERSION": resolved_version,
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
