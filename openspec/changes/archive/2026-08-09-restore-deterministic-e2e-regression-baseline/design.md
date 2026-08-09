## Context

See `proposal.md` for motivation. The current full deterministic test invocation has three
independent red assertions:

1. The isolated native-finalizer fixture copies only a historical subset of the finalizer's
   governance dependencies, so `check-project-reqs.mjs` cannot import its current local contract.
2. The Harness migration E2E pins `v0.74`, while the authoritative `RUN.md` release banner is
   `v0.82`.
3. The post-final lineage E2E proves C5's compatibility stage after a registry-length change but
   calls the formal `rerun-ready` Gate before the existing required style handoff.

The direct Sources of Record remain the production finalizer's actual dependency/check sequence,
`DEEP_RESEARCH_HARNESS/RUN.md` plus the current top-level changelog release, and the accepted
research-style, post-final-recovery, and rerun-node contracts. The tests are readers of those
facts; they do not own or reinterpret them.

## Goals / Non-Goals

**Goals:**

- Restore a green, meaningful deterministic test baseline against current production contracts.
- Keep the finalizer integration proof native and isolated while supplying its complete current deterministic
  prerequisites.
- Preserve both sides of the post-final boundary: C5 recognizes an event-bound compatible shape,
  while the formal Gate rejects stale current style parameters until the existing writer runs.

**Non-Goals:**

- No change to finalizer behavior, Harness runtime behavior, Gate rules, C5 stages, versions, or
  accepted specifications.
- No mock finalizer, test-only bypass, alternate style writer, or replacement control loop.
- No Semantic Fact Closure family addition or affected-record claim.

## Decisions

### Supply the fixture's actual governance prerequisites

The native archive integration test will copy the production finalizer plus the exact current
governance checker closure it invokes: requirement, main-spec, capability-taxonomy,
capability-discovery, verification-routing, and semantic-closure checkers and their local
contracts. The isolated project will supply the associated static inputs: a requirement registry
and synchronized main spec, a one-row capability catalog, the semantic-fact catalog, and
change-local proposal, design, tasks, verification-routing, and semantic-closure records. Its
fixture change will declare `skip_specs: true` with a reason, so it has no artificial delta spec
to archive. The fixture retains the current `node_modules` and Harness links needed to execute
the copied production scripts.

The test will assert the archived result's ordered `checks` list contains every production
finalizer stage: status, artifacts, tasks, strict validation, requirement governance, main-spec
governance, capability taxonomy, capability discovery, verification routing, semantic closure,
and native archive. This makes a missing checker, copied contract, fixture record, or test-only
short circuit observable instead of accepting a merely archived-looking result.

This keeps the finalizer executable from the fixture's own root and catches a broken dependency
graph. A mocked process result or removal of finalizer checks would make the test green while
discarding the contract it exists to prove.

The test invokes one production finalizer CLI against an isolated temporary project; it does not
drive a current run bundle through multiple Harness checkpoints. It therefore belongs under
`tests/integration/governance/` with `runtime: none`, rather than claiming a temporary-bundle
runtime merely because the fixture root is temporary. The two Harness lifecycle tests remain
`deterministic_e2e` because they do drive temporary run bundles through multiple checkpoints.

### Read current release identity rather than pin a historical version

The migration E2E will derive the current release identity from the authoritative `RUN.md`
banner and current-release declaration, require those two declarations to agree, and verify that
the matching top-level changelog section has at least one release entry. It will not hardcode a
version or carry release-specific facts, such as the historical `v0.74` breaking-change text,
forward as a permanent invariant.

`RUN.md` remains the entry release coordinate; `CHANGELOG.md` remains the release-history
coordinate. The test compares them but does not manufacture a release projection.

### Model the C5 compatibility and formal Gate as separate checks

The post-final E2E will keep the event-bound parameter object through the recorded count
increment, assert that C5 recognizes `synchronized_count_incremented`, then assert the formal
`rerun-ready` Gate reports the one existing `style_projection_freshness` repair root. It will run
that returned/existing style writer and then assert the same Gate passes.

This reflects the current contract precisely: C5's lineage explanation is not a general
freshness override. The direct Gate fact is the current selected style plus committed registry
length. Reusing its one writer and same-Gate rerun avoids a duplicate predicate, test-only
exception, or second controller.

No new named runtime state, projection, command, or reader-facing view is introduced. The
semantic-precision, control-simplicity, and helper-responsibility reviews are therefore not
applicable to a test-only alignment; the existing Engine verdict and Agent execution boundaries
remain unchanged.

## Risks / Trade-offs

- [Fixture dependency drift] -> Copy the complete production governance dependency surface used by
  the finalizer, supply each checker's declared minimum record, and assert the finalizer's complete
  ordered check list.
- [Dynamic release assertion becomes too weak] -> Assert the two independent `RUN.md` coordinates
  agree, the matching top-level changelog section has a release entry, and no Harness-local
  changelog exists rather than merely checking that files exist.
- [C5 test loses compatibility coverage] -> Assert C5's accepted intermediate stage before the
  formal Gate's intentional freshness failure and subsequent legal repair.
- [Verification route misstates runtime context] -> Keep the single-finalizer CLI proof in the
  integration class and reserve `deterministic_e2e` for the two temporary-bundle lifecycle chains.

## Migration Plan

No deployment or runtime migration is required. Apply modifies only deterministic tests, then
runs the focused E2E cases and the repository-wide test command. Reverting the test changes
restores only prior test expectations; it does not alter runtime state or production behavior.
