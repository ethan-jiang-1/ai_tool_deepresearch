> req: CMI-009

## RENAMED Requirements

- FROM: `### Requirement: Bundle creators render RUN_BUNDLE.md with actual framework coordinates`
- TO: `### Requirement: Bundle creators render BUNDLE_ENTRY.md with actual Harness coordinates`

## MODIFIED Requirements

### Requirement: Bundle creators render BUNDLE_ENTRY.md with actual Harness coordinates

When production `instantiate-run-bundle.mjs` creates a bundle, it SHALL
resolve the created bundle directory and the physical
`DEEP_RESEARCH_HARNESS/` source root before rendering coordinates. It SHALL
render `BUNDLE_ENTRY.md` with the bundle name and a canonical-Harness-root
relative path calculated from those resolved locations. Any framework-root
coordinate rendered in `BUNDLE_ENTRY.md` or `BUNDLE_MAP.md` SHALL point to the
canonical physical Harness root even when the creator was invoked through the
legacy alias. It SHALL NOT assume the bundle is a sibling of the Harness
merely because that is the default target layout, and it SHALL NOT emit a
canonical `RUN_BUNDLE.md`.

`--target-dir` MAY be an explicit relative input, but after the bundle exists
the creator SHALL print its filesystem-resolved canonical absolute directory
to stdout for the current-run-bundle-root handoff. It SHALL not print or pass
a cwd-relative bundle spelling as that handoff coordinate.

The rendered coordinates are static navigation text, not runtime authority or a
new persistent schema field. Existing validation, inspection, trace/log,
schema, and no-overwrite contracts remain unchanged.

#### Scenario: BUNDLE_ENTRY.md receives correct creator-rendered coordinates

- **WHEN** a production creator writes a bundle beneath an explicit target
  directory outside the Harness's sibling layout
- **THEN** its `BUNDLE_ENTRY.md` SHALL contain a Harness path that resolves
  from that bundle to the actual canonical Harness root used by the creator
- **AND** it SHALL NOT contain a fixed `../DPT_FRAMEWORK/` assumption

#### Scenario: Relative creator target yields an absolute current-root handoff

- **WHEN** the production creator receives an explicit relative `--target-dir`
- **THEN** it SHALL create the same bundle layout under that target and print
  the created bundle's canonical absolute directory to stdout
- **AND** its rendered Harness coordinates SHALL resolve to
  `DEEP_RESEARCH_HARNESS/`, not the legacy compatibility alias
