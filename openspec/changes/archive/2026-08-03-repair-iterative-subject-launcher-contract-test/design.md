## Context

See `proposal.md` for motivation. `run-iterative-interaction-subject.mjs` now delegates Subject CLI argv construction to `iterative-interaction-subject-launch.mjs`. The existing integration test reads only the runner, so its static `--setting-sources ''` assertion is attached to the old implementation location even though the pure builder is the current direct source of record.

No runtime state, Agent flow, Engine transition, provider capability, or accepted behavior changes in this repair. Semantic-precision and control-shape reviews are therefore not applicable beyond preserving the existing module ownership distinction.

## Goals / Non-Goals

**Goals:**

- Make the integration contract read launcher-owned argv facts from the launcher module.
- Keep runner-owned assertions in the runner module so a future move has one clear failing owner assertion.
- Preserve the existing focused case-115 launcher unit test as complementary coverage.

**Non-Goals:**

- Changing selected-host arguments, permissions, tool access, Subject timeout, or provider routing.
- Starting an Agent runtime or making real external calls.
- Moving lifecycle assertions or adding a new test class.

## Decisions

### Read both sources explicitly in the existing integration test

Add a `subjectLauncher` source read next to the existing `subjectRunner` read. Assert `--setting-sources ''` against `subjectLauncher`, then assert that the runner does not duplicate that argv literal.

This reflects the actual module boundary without creating a test-only parser or exporting new production configuration. The alternative of moving the argv construction back into the runner would undo the pure-builder separation and is rejected. The alternative of deleting the assertion would leave the selected invocation fact without integration-level ownership coverage.

### Keep the verification route as integration

The asset already lives under `tests/integration/` and guards a boundary across the runner, pure launcher, and Markdown-facing Subject configuration. It remains a deterministic `node:test` contract with no runtime bundle or external calls.

## Risks / Trade-offs

- [Static source checks can be brittle during future refactors] -> The assertion names the owner module deliberately, so a later ownership change fails at the precise contract and can be updated with its accompanying refactor.
- [Duplicated coverage with the focused case-115 unit test] -> The tests answer different questions: the unit test verifies argv construction, while the integration test verifies cross-module ownership placement.
