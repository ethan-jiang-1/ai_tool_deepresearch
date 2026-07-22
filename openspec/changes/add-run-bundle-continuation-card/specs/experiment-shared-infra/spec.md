> req: EXS-004

## ADDED Requirements

### Requirement: Disposable creator renders shared map navigation coordinates

`experiments_env/shared/new-disposable-bundle.mjs` SHALL render the same
`BUNDLE_MAP.md` framework-root and repo-command-root relative navigation
coordinates as the production creator, calculated from each generated bundle
directory to the actual repository framework source. It SHALL replace every
continuation-card template placeholder used by the shared map.

These coordinates remain static navigation text; disposable bundle creation
does not gain a framework copy, a runtime-state field or a new verdict.

#### Scenario: Non-sibling disposable target has no unresolved card placeholder

- **WHEN** the disposable creator writes a case bundle beneath an explicit
  non-sibling target directory
- **THEN** its map SHALL contain resolving framework/repo relative coordinates
- **AND** it SHALL contain no unresolved continuation-card placeholder or
  fixed sibling-layout assumption
