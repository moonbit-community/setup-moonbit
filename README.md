# Setup Moonbit

A simple template is provided [here](https://github.com/moonbit-community/moonbit-workflow/blob/master/.github/workflows/check.yaml)

## Input 

version : string = "stable" | "pre-release" | "bleeding"


## Example

```yaml
- name: Setup Moon
  uses: illusory0x0/setup-moonbit@v0.1.0
  with: 
    version: stable
```