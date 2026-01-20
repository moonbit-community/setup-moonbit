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
