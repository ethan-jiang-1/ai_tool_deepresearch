# Retire the Legacy Harness Source Alias

## Status

Accepted

## Context

One reusable Harness source coordinate must be legible to both people and
Agents. A second filesystem entry to the same assets introduces path drift:
commands, imports, tests, and guidance can each select a different spelling
without changing the underlying implementation. Existing run bundles can
retain creation-time navigation text, but that text must not create an ongoing
source-location compatibility obligation.

## Decision

`DEEP_RESEARCH_HARNESS/` is the sole reusable Harness source, import, and
command coordinate. The repository removes the former root-level alias and
all production fallback paths that treated another coordinate as the same
source tree.

An explicitly supplied existing bundle with an unreachable rendered Harness
coordinate remains bounded by the continuation procedure: report the selected
Harness context as unavailable and stop before executing a bundle-provided
command. Do not rewrite the bundle, scan for another bundle, create another
source path, or infer a replacement coordinate.

## Consequences

This is a breaking source-coordinate retirement. Current production imports,
commands, tests, and guidance use only `DEEP_RESEARCH_HARNESS/`. Existing
`dpt_rb_*`, `dpt_disp_*`, and legacy `RUN_BUNDLE.md` bundle compatibility stay
intact, but do not restore another Harness source coordinate. Historical
records remain in Git and archived OpenSpec artifacts rather than a supported
live path.
