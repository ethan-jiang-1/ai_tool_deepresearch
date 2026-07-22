> req: EXS-004

## MODIFIED Requirements

### Requirement: Disposable creator renders RUN_BUNDLE.md with actual coordinates

`experiments_env/shared/new-disposable-bundle.mjs` SHALL render `RUN_BUNDLE.md`
with the same framework-root relative navigation coordinates as the production
creator, calculated from each generated bundle directory to the actual
repository framework source. It SHALL replace every template placeholder used
by the shared `RUN_BUNDLE.md.tmpl`.

These coordinates remain static navigation text; disposable bundle creation
does not gain a framework copy, a runtime-state field or a new verdict.

#### Scenario: Non-sibling disposable target has no unresolved placeholder

- **WHEN** the disposable creator writes a case bundle beneath an explicit
  non-sibling target directory
- **THEN** its `RUN_BUNDLE.md` SHALL contain resolving framework relative
  coordinates
- **AND** it SHALL contain no unresolved template placeholder or fixed
  sibling-layout assumption
