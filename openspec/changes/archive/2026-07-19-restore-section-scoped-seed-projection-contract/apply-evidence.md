# Apply Evidence

## Scope

All commands ran from `/Users/bowhead/ai_tool_deepresearch` on 2026-07-20. Test assets use temporary/disposable bundles; no production research bundle was selected or mutated. Return-map projection remains owned by the mandatory pre-gate Wave inspect commands, not by formal Wave Gate rules.

## Verification Routing Baseline

Before target edits, the planned routes were checked with:

```text
node openspec/governance/check-verification-routing.mjs --change restore-section-scoped-seed-projection-contract --mode plan
```

Result: PASS. All five declared claims resolved to selected `unit`, `integration`, and `deterministic_e2e` routes; `agent_flow_e2e` remained not applicable because the change makes only deterministic contract claims.

## Original False Pass And Post-Fix Result

The pre-change implementation was executed from a read-only `git archive HEAD` snapshot with the repository `node_modules` linked read-only. A temporary `node:test` fixture created one seed with:

- a complete five-field entry under Wave0 `## 本轮新增证据`; and
- only free-form prose under Wave1 `## 本轮新增机制理解`.

Command in the snapshot:

```text
node --test rrm007-false-pass.test.mjs
```

Result: PASS, 1/1. The assertion proved the old `inspectSeedTopicReturnMaps(..., { wave: 'wave1' })` returned `passed: true` and no findings because it validated the whole seed and borrowed the Wave0 fields.

The same content was then executed against the current implementation with canonical seed/topic binding supplied:

```text
node --test /tmp/rrm007-post-fix.test.mjs
```

Result: PASS, 1/1. The assertion proved Wave1 inspection returned `passed: false` with `return_map_unsupported_prose`. The durable regression is `blocks prose-only Wave1 content instead of borrowing complete Wave0 fields` in `tests/engine/helpers/return-map.test.mjs`.

The production rerun chain additionally proved the authority-demand case:

```text
node --test --test-name-pattern='blocks omitted current-row seed projection' tests/e2e/rerun-round-continuity.test.mjs
```

Result: PASS, 1 passed and 12 skipped. The real Wave1 inspect blocked an omitted current-round row, then passed after adding only entry-local `entry_id: <work_id>/1`; index, ledger, and manifest authority bytes stayed unchanged.

## Five Routed Claims

| Claim | Exact command | Result |
|---|---|---|
| `target-section-isolation` | `node --test tests/engine/helpers/return-map.test.mjs` | PASS, 13/13 |
| `normalized-submitted-reader-parity` | `node --test tests/engine/helpers/gate-helpers-readers.test.mjs` | PASS, 29/29 |
| `current-authority-projection-predicate` | `node --test tests/engine/work-unit-projection.test.mjs` | PASS, 6/6 |
| `wave-inspect-projection-feedback` | `node --test tests/integration/cli/inspect-wave-return-map.test.mjs` | PASS, 12/12 |
| `rerun-current-round-projection-continuity` | `node --test --test-name-pattern='blocks omitted current-row seed projection' tests/e2e/rerun-round-continuity.test.mjs` | PASS, 1/1 selected |

The broader focused regression required by task 4.5 also passed:

```text
node --test tests/engine/helpers/canonical-topic-state.test.mjs tests/engine/helpers/gate-helpers-readers.test.mjs tests/engine/work-unit-projection.test.mjs tests/engine/helpers/return-map.test.mjs tests/integration/cli/rerun-round-continuity.test.mjs tests/integration/cli/inspect-wave-contract-output.test.mjs
```

Result: PASS, 84/84. This covers canonical seed-binding parity, normalized reader parity, narrow eligible projection, entry/section behavior, CLI eligible-row compatibility, and inspect no-write/output compatibility.

Additional Wave2 pair-fact and inspect-purity regression:

```text
node --test tests/integration/cli/inspect-wave-return-map.test.mjs tests/engine/wave-depth-contracts.test.mjs tests/schema/wave-inspect-purity-static.test.mjs
```

Result: PASS, 38/38. Existing Wave2 pair-fact behavior and no-write inspect ownership remain unchanged while shared-pending ownership, profile-round roots, and affected-topic projection are exercised.

## Full Repository Suite

```text
npm test
```

Result: 2,038 tests; 2,022 passed; 16 failed. The earlier Wave1 test expectation adjacent to this change was corrected and now passes. The remaining failures reproduce independently in four unrelated ownership areas and do not import or execute any of the five proof assets:

| Reproducer | Failures | Independent root |
|---|---:|---|
| `node --test tests/engine/version-management.test.mjs` | 1 | Test opens removed historical path `openspec/changes/simplify-iterative-research-interaction/specs/run-entry/spec.md` and gets `ENOENT`. The v0.35 newest-entry/banner checks pass independently. |
| `node --test tests/integration/host-tools/claude-deepseek.test.mjs` | 13 | Existing host launcher/test-environment failures return exit 1 before the expected wrapper behavior; outside Wave/return-map/projection code. |
| `node --test tests/schema/gate-rule-audit.test.mjs` | 1 | Existing `handoff-helpers.mjs` Gate-definition read does not use the shared reader; outside this change and formal Gate wiring is explicitly a non-goal. |
| `node --test tests/integration/cli/handoff-witnessing-lifecycle.test.mjs` | 1 | Existing high-attempt Wave0 pass omits the expected fatigue continuation advice; outside section-scoped seed projection. |

Task 4.6 therefore satisfies its explicit alternative: every remaining failure is captured by a reproducible focused command and none affects the five routed claims.

## Requirement And Release Traceability

- `RRM-007` and `IOC-005` already exist in `openspec/governance/req-registry.yaml`; no requirement ID was added.
- Accepted specs remain the registry owners; delta specs modify only `RRM-007` and `IOC-005`.
- Production owners and focused tests carry `@impl RRM-007` / `@impl IOC-005` annotations.
- This evidence relies on executed commands and assertions, not archived tasks 7.2/7.3 or old CHANGELOG prose.
- `CHANGELOG.md` and the `DPT_FRAMEWORK/RUN.md` banner/current-release summary are aligned at `v0.35`; the focused banner check passed 2/2 selected tests.

## Final Checks

- `node openspec/governance/check-verification-routing.mjs --change restore-section-scoped-seed-projection-contract --mode assets`: PASS, 5 claims.
- `node openspec/governance/check-project-reqs.mjs`: PASS, 560 registered, 53 retired, 0 orphan, 627 active occurrences; no duplicate, unregistered, or reused-retired requirement.
- `node openspec/governance/check-project-specs.mjs`: PASS, 77 main specs, 0 violations.
- `openspec validate restore-section-scoped-seed-projection-contract --strict`: PASS.
- Version alignment selected tests: PASS, 2/2.
- `git diff --check`: PASS.

Final manifest review found no deviation: no whole-seed or family-aggregate masking validator, duplicate ledger/index pairing, gate-reader/validation cycle, directory-derived Wave2 seed scope, per-section content quota, anonymous disposition, full work-unit/topic-state health prerequisite, duplicate pair-fact token map, pair-fact behavior change, formal Gate wiring, new CLI/state, or runtime migration was added.
