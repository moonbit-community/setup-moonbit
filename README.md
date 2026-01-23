# Setup Moonbit

A GitHub Action that installs and configures the [Moonbit](https://www.moonbitlang.com/) toolchain.

## Features

- Installs Moonbit toolchain on Linux, macOS, and Windows runners
- Supports multiple version channels: `latest`, `nightly`, and `pre-release`
- Caches installations to speed up workflow runs
- Adds Moonbit binaries to PATH automatically

## Inputs

| Input     | Description                                                                                                          | Required | Default  |
| --------- | -------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| `version` | Moonbit version to install: `latest`, `nightly`, `pre-release` (or aliases: `stable`→`latest`, `bleeding`→`nightly`) | No       | `latest` |

## Example Usage

```yaml
- name: Setup Moonbit
  uses: moonbit-community/setup-moonbit@main
  with:
    version: latest
```

## Version Channels

| Channel                 | Description           |
| ----------------------- | --------------------- |
| `latest` or `stable`    | Latest stable release |
| `nightly` or `bleeding` | Latest nightly build  |
| `pre-release`           | Pre-release version   |

## License

MIT
