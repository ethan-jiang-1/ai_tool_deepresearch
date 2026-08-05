> req: EXS-004

## RENAMED Requirements

- FROM: `### Requirement: Disposable creator renders RUN_BUNDLE.md with actual coordinates`
- TO: `### Requirement: Disposable creator renders BUNDLE_ENTRY.md with actual coordinates`

## MODIFIED Requirements

### Requirement: Disposable creator renders BUNDLE_ENTRY.md with actual coordinates

`experiments_env/shared/new-disposable-bundle.mjs` SHALL resolve each created
bundle directory and the physical `DEEP_RESEARCH_HARNESS/` source root before
rendering `BUNDLE_ENTRY.md`. It SHALL render the same canonical-Harness-root
relative navigation coordinates as the production creator, including any
framework-root coordinate in `BUNDLE_MAP.md`; legacy invocation coordinates
SHALL NOT become authored canonical coordinates. It SHALL replace every
template placeholder used by the shared `BUNDLE_ENTRY.md.tmpl` and SHALL not
emit a canonical `RUN_BUNDLE.md`.

`--target-dir` MAY be an explicit relative input, but after the disposable
bundle exists the creator SHALL print its filesystem-resolved canonical
absolute directory to stdout for the current-run-bundle-root handoff.

These coordinates remain static navigation text; disposable bundle creation
does not gain a Harness copy, a runtime-state field, or a new verdict.

#### Scenario: Non-sibling disposable target has no unresolved placeholder

- **WHEN** the disposable creator writes a case bundle beneath an explicit
  non-sibling target directory
- **THEN** its `BUNDLE_ENTRY.md` SHALL contain resolving canonical-Harness
  relative coordinates
- **AND** it SHALL contain no unresolved template placeholder or fixed
  sibling-layout assumption

#### Scenario: Relative disposable target yields an absolute current-root handoff

- **WHEN** the disposable creator receives an explicit relative `--target-dir`
- **THEN** it SHALL print the created `dpt_disp_*` bundle's canonical absolute
  directory to stdout
- **AND** its rendered Harness coordinates SHALL resolve to
  `DEEP_RESEARCH_HARNESS/`
