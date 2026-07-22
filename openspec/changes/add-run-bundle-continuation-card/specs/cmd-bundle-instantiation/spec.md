> req: CMI-009

## ADDED Requirements

### Requirement: Bundle creators render their actual framework navigation coordinates

When production `instantiate-run-bundle.mjs` creates a bundle, it SHALL render
the `BUNDLE_MAP.md` framework-root and repo-command-root coordinates as paths
relative to the newly created bundle directory and calculated from the actual
framework/repository locations used by the creator. It SHALL not assume the
bundle is a sibling of `DPT_FRAMEWORK/` merely because that is the default
target layout.

The rendered coordinates are static navigation text, not runtime authority or
a new persistent schema field. Existing validation, inspection, trace/log,
schema and no-overwrite contracts remain unchanged.

#### Scenario: Explicit target directory receives correct relative coordinates

- **WHEN** a production creator writes a bundle beneath an explicit target
  directory outside the framework's sibling layout
- **THEN** its map SHALL contain coordinates that resolve from that bundle to
  the actual framework root and repo command root used by the creator
- **AND** it SHALL not contain the fixed `../DPT_FRAMEWORK/` assumption
