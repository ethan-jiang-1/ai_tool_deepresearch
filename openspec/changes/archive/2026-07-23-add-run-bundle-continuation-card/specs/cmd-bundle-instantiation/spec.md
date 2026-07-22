> req: CMI-009

## MODIFIED Requirements

### Requirement: Bundle creators render RUN_BUNDLE.md with actual framework coordinates

When production `instantiate-run-bundle.mjs` creates a bundle, it SHALL render
`RUN_BUNDLE.md` with the bundle name and framework-root relative path calculated
from the actual framework location used by the creator. It SHALL NOT assume the
bundle is a sibling of `DPT_FRAMEWORK/` merely because that is the default
target layout.

The rendered coordinates are static navigation text, not runtime authority or
a new persistent schema field. Existing validation, inspection, trace/log,
schema and no-overwrite contracts remain unchanged.

#### Scenario: RUN_BUNDLE.md receives correct creator-rendered coordinates

- **WHEN** a production creator writes a bundle beneath an explicit target
  directory outside the framework's sibling layout
- **THEN** its `RUN_BUNDLE.md` SHALL contain a framework path that resolves
  from that bundle to the actual framework root used by the creator
- **AND** it SHALL NOT contain a fixed `../DPT_FRAMEWORK/` assumption
