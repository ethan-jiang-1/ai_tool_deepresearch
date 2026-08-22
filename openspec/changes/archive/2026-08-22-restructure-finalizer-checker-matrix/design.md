## Context

The finalizer's ordered chain (`finalize-change-archive.mjs:248-545`) is:
`openspec status` → artifacts → tasks (markers) → `openspec validate
--strict` → check-project-reqs (`--mode archive --change`) →
check-project-specs (`<root>`) → check-capability-taxonomy (`--change`) →
check-capability-discovery (`--change`) → check-verification-routing
(`--change --mode assets`) → check-semantic-closure (`--change --mode
assets`) → content-drift → 5 guard checkers → native archive. Each failure is
mapped to a code (e.g. `main_spec_governance_failed`). The rank-1 test's six
finalizer runs re-derive the whole chain five times over.

## Goals / Non-Goals

**Goals:**

- Keep every failure identity and the ordered short-circuit proof.
- Prove the short-circuit at both ends with real finalizer runs, and prove
  each intermediate boundary's checker failure directly (no replay).
- Keep every assertion's fact set; do not merge test cases or reduce
  assertion count below the same facts.

**Non-Goals:**

- No change to `finalize-change-archive.mjs`, any checker, or archive
  semantics.
- No restructure of ranks 4, 6, 7, 12 or the static-route tests (their
  production sentinels are the proof; optimization risks it).
- No change to the archive-success sentinel (`change-feedback-loop-archive.test.mjs`).

## Design

### Rank 1 — two finalizer sentinels + direct checker matrix

Fixture: one `createGovernanceFixture()` (as today), repaired progressively.

1. **Sentinel 1** — initial fixture: `runFinalizer(root)` →
   `root.code === 'requirement_governance_failed'`,
   `checks == ['openspec_status','artifacts','tasks','strict_validation']`
   (chain stops before any checker).
2. **Direct matrix** — after each repair, invoke the checker exactly as the
   finalizer does:
   - main-spec: `node openspec/governance/check-project-specs.mjs <root>` →
     status ≠ 0 + native failure output.
   - taxonomy: `node .../check-capability-taxonomy.mjs --change demo-change` →
     status ≠ 0.
   - discovery: `node .../check-capability-discovery.mjs --change demo-change` →
     status ≠ 0.
   - routing: `node .../check-verification-routing.mjs --change demo-change
     --mode assets` → status ≠ 0.
   Each row proves the boundary's failure identity natively (the exact
   production invocation). Assertion text is pinned to the checker's real
   failure output captured during apply (verified empirically).
3. **Sentinel 2** — after `writeRoutingAndClosureFixture(root, { catalog:
   false })`: `runFinalizer(root)` →
   `root.code === 'semantic_closure_failed'`,
   `checks == ['openspec_status','artifacts','tasks','strict_validation',
   'requirement_governance','main_spec_governance','capability_taxonomy',
   'capability_discovery','verification_routing']` (complete ordered chain),
   `root.owner` matches `check-semantic-closure.mjs`.
4. **Static mapping** — new `it()` reads `finalize-change-archive.mjs`
   source and asserts each checker script appears before its failure code
   (script → code adjacency), consistent with the existing static source
   assertions in the suite.

Cost: 2 finalizer runs (~8s) + 4 direct checker runs (~2s) vs 6 runs (~24s).

### Rank 3 — two projections + static guidance sources

Keep: `createGeneratedFeedbackChange()` + `openspec instructions tasks --json`
(marker-rule assertions, unique to the tasks projection) + `openspec
instructions apply --json` (operationGuidance incl. the
`check-verification-routing` before `check-semantic-closure` closure ordering
and `missing-command fallback`). Drop: the `proposal` and `archive`
instructions launches. Their assertions move to static reads of the repo
sources the CLI embeds:
- `openspec/operations/change-feedback-loop.md` (already read at `:313`;
  the apply/archive review vocabulary `actual symbol or document anchor`,
  `bare file coordinate`, `verdict consumers`, `overlap: derived`,
  `does not validate fragment/role semantics`, `ordinary unchecked task`,
  `unknown`),
- `openspec/governance/requirement-reservation-contract.mjs` and
  `openspec/config.yaml` (the `requirement-reservation.yaml` +
  `check-project-reqs.mjs --mode plan` + reservation-pre-registration rule
  fragments),
- `openspec/governance/semantic-fact-closure-contract.mjs` (the
  `semantic-fact-families.yaml` / `semantic-closure.yaml` /
  `catalog_additions` fragments).

If any fragment is not verbatim in those sources (CLI-template-derived), the
corresponding projection call is retained — verified during apply before the
final edit.

### Assertion preservation

Every `it()`, every assertion line, and every fixture state is preserved or
moved to an equivalent direct/static proof; no fact is dropped and no case is
merged. Ranks 4/6/7/12 and the static-route tests are untouched.

## Duplication ledger (measured)

| Leaf | Before | After (expected) |
|---|---:|---:|
| rank 1 (short-circuits) | 24.2s | ~10s |
| rank 3 (marker instructions) | 22.7s | ~16s |
| ranks 4/6/7/12 + static | unchanged | unchanged |
| file total | 52.7s | ~33s |

## Risks And Open Questions

- Direct checker invocations must byte-match the finalizer's (verified from
  `finalize-change-archive.mjs` source during this change).
- Static mapping assertion pins implementation layout (script-before-code);
  acceptable — the suite already pins finalizer source order (`:540-541`).
- Rank-3 static fragments verified empirically before finalizing; fallback
  retains the projection call.
