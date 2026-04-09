# Setup Moonbit

Add this action directly to your workflow. Start from a normal job in your own
repository instead of a separate template repo.

## Example

```yaml
name: check

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Moon
        # Recommended: pin to a commit SHA for reproducibility until release tags exist.
        uses: moonbit-community/setup-moonbit@main
        with:
          version: latest

      - name: Moon version
        run: moon version --all

      - name: Check
        run: moon check --target all
```

## Input

version : string = "latest" | "nightly" | "pre-release"

Aliases:

- stable -> latest
- bleeding -> nightly

## Supported Platforms

- macOS `aarch64`
- Linux `x86_64`
- Linux `aarch64`
- Windows `x86_64`
- Windows `arm64` via the `x86_64` archive

Intel macOS runners are not supported.

## Cache behavior

On non-Windows runners, this action caches `~/.moon`.

- The cache key is derived from the requested channel, the resolved download target, and the published `.sha256` for the MoonBit archive.
- `latest`, `nightly`, and `pre-release` therefore refresh when the upstream MoonBit archive changes, instead of on a fixed calendar bucket.
- Cache restore/save is best-effort. If the cache service is unavailable or a cache operation fails, the action still installs MoonBit normally.

## Contributing

Prereqs: Node.js >= 20 and npm.

### Local setup

```bash
npm install
```

### Common tasks

```bash
# Format, lint, test, build, and refresh dist/ in one go
npm run all

# Or run steps individually
npm run format:write
npm run lint
npm run test
npm run package
```

### Important: update dist/

This action checks in the compiled output. If you change `src/`, run:

```bash
npm run bundle
```

Then commit the updated `dist/` files along with your changes.
