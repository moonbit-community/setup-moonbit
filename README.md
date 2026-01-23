# Setup Moonbit

A simple template is provided [here](https://github.com/moonbit-community/moonbit-workflow/blob/master/.github/workflows/check.yaml)

## Input

version : string = "latest" | "nightly" | "pre-release"

Aliases:

- stable -> latest
- bleeding -> nightly

## Example

```yaml
- name: Setup Moon
  # Recommended: pin to a release tag (e.g. v0.1.0) once published.
  # Until then, use `@main` (or pin to a commit SHA for reproducibility).
  uses: moonbit-community/setup-moonbit@main
  with:
    version: latest
```

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
