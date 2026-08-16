## Context

See `proposal.md` for motivation. The failed assertions span five independent
test surfaces, but each compares current implementation or accepted guidance to
a stale local expectation. The correct repair owner is the test or fixture that
reconstructs an obsolete contract, not the production code that now satisfies
the accepted one.

## Goals / Non-Goals

**Goals:**

- Restore full-suite regression coverage by making each affected test observe
  its current direct source: Gate definition, CLI directory inventory,
  handoff admission fixture, or governed task-marker contract.
- Keep every assertion specific enough to fail when its actual source changes.
- Preserve a focused-to-full verification path that demonstrates each repair
  and then the complete suite.

**Non-Goals:**

- Do not alter runtime schemas, gate definitions, CLI invocation/exit behavior,
  lifecycle transitions, generated entry semantics, or OpenSpec requirements.
- Do not weaken a test by deleting its meaningful assertion, broadly skipping
  files, or accepting an unavailable native Agent-flow observation.

## Decisions

### 1. Repair stale observers at their local source

Each failure is classified before editing:

| Failure group | Direct source | Repair boundary |
| --- | --- | --- |
| Wave1 Gate CLI expectations | current Gate evaluator output and current submitted-backing contract | Update only stale test inputs/assertions. |
| Gate definition counts | current named rule definitions | Update exact current totals and retain named rule/invariant coverage so a later rule-set change still fails visibly. |
| CLI exit-code inventory | actual managed CLI command surface | Update the inventory assertion for the existing command. |
| Handoff lifecycle fixture | current composition-handoff prerequisite | Add the legal fixture record before testing its downstream lifecycle. |
| Feedback finalizer entry assertion | accepted `CHF-001` task-marker and entry-guidance split | Assert the marker in generated `tasks.md`, and guidance retrieval at entry surfaces. |

This keeps the existing source of record in place. It is shorter and more
reliable than changing production behavior to satisfy a historical test.

Alternative rejected: masking failures with skips, broad snapshots, or loose
text matching would conceal future contract drift.

### 2. Preserve test class and deterministic evidence boundary

All repairs remain `integration` or `unit` tests under `tests/`. Fixture
completion proves deterministic admission/path behavior only. It does not
assert Agent semantic compliance, report quality, or user satisfaction.

No new named runtime fact, state, projection, module, command, or reader-facing
view is introduced. Therefore the constitutional semantic-precision, control,
and responsibility review has no changed runtime layer to apply: the direct
facts and responsibility split remain with the existing accepted contracts.

### 3. Verify exact affected paths, then the canonical full suite

Run each repaired file directly with `node --test`, then run canonical
`npm test`. The latter is the only full-suite aggregate command; `node --test
tests` is not equivalent under the supported Node runtime.

## Risks / Trade-offs

- A historical test may encode a real intended behavior rather than a stale
  expectation -> compare it to the accepted spec and current owner before
  changing it; any behavior mismatch stops this change for a new scoped plan.
- A dynamic count can become too permissive -> retain exact current totals
  together with assertions over named rule identities or invariant sets.
- Full suite may expose an additional independent regression -> record its
  direct owner; do not silently expand this change beyond the five classified
  groups.
