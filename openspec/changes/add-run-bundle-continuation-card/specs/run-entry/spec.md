## ADDED Requirements

### Requirement: Entry guidance separates new-run trigger from bundle continuation

Framework entry guidance SHALL distinguish the one-time `RUN.md` trigger for
selecting DPT_FRAMEWORK and starting new research from a supplied
`BUNDLE_MAP.md` continuation card that identifies a candidate existing bundle.
`RUN.md` SHALL remain the new-run front door; card attachment SHALL route an
Agent to the canonical existing-bundle continuation playbook and existing
runtime diagnostics.

Both paths SHALL assign ordinary legal command execution to the Agent. Neither
card attachment nor a natural-language continuation request SHALL silently
create lifecycle entry, pause, route, rerun authority or a new framework
interaction checkpoint.

#### Scenario: Card does not start a second new run

- **WHEN** an Agent receives an existing bundle's `BUNDLE_MAP.md` with a
  request to continue or inspect it
- **THEN** entry guidance SHALL direct the Agent to the existing-bundle
  continuation playbook before `start-research`
- **AND** it SHALL not create a second bundle merely because `RUN.md` is the
  framework's new-run front door

#### Scenario: Continuation keeps Agent/Engine roles unchanged

- **WHEN** entry guidance explains card-based continuation
- **THEN** it SHALL assign direct command execution and mechanical repair to
  the Agent under existing contracts
- **AND** it SHALL retain current state, Gate, receipt, trace and reentry
  verdict ownership with existing bundle/Engine surfaces
- **AND** it SHALL not represent the user's wording as permission or a new
  interactive lifecycle checkpoint
