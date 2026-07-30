# Apply Evidence

## Verification Boundary

This change changes deterministic artifact-family evaluator selection,
rich-reference metadata interpretation, and reentry's reuse of an existing
reference-authority classifier. Its verification plan selects `unit` and
`integration` only. The tests below prove deterministic contracts over focused
fixtures and temporary bundles; they do not claim a live Agent, sub-agent,
host capability, or research run outcome.

## Deterministic Regression Evidence

- `2026-07-30`: ran every selected verification-plan asset:

  ```text
  node --test tests/engine/helpers/return-map.test.mjs tests/engine/helpers/gate-helpers-checks.test.mjs tests/integration/cli/inspect-wave-return-map.test.mjs tests/integration/cli/check-gate-wave1-complete.test.mjs tests/integration/cli/check-reentry.test.mjs tests/integration/md/parser-aligned-guidance.test.mjs
  ```

  Result: `107` tests passed, `0` failed. This covers Seed Topic-only
  return-map inputs; canonical, legacy, and invalid rich-reference metadata;
  Wave inspect and formal Wave1 Gate family separation; shared normal-Wave and
  reentry reference-authority classification; and parser-aligned authoring
  guidance.

## Release Projection

- `2026-07-30`: updated `CHANGELOG.md` and `DPT_FRAMEWORK/RUN.md` to `v0.61`.
  The release wording is limited to evaluator convergence, shared metadata
  interpretation, and reentry classifier reuse. It claims no new authority,
  controller, or Agent capability.

## Existing-Bundle Counterexample

- `2026-07-30`: ran the current framework CLIs read-only against the existing
  bundle `/Users/bowhead/ai_tool_deepresearch/dpt_rb_openspec-evolution-popularity-user-demands`, the bundle recorded by BUG-146, BUG-162, and BUG-178.
  `inspect-wave0-output` passed `31` checks with no failed rule IDs;
  `inspect-wave1-output` passed `68` checks with no failed rule IDs. Both
  report `return_map_classification: diagnostic-only`, so the former generic
  rich-reference and Wave1-artifact parser roots are absent.
- The same run of `check-reentry --at wave0_complete` passed with exit `0`,
  `0` `ledger_coverage` blockers, and `55` references classified as
  `phase_owned_projection`. This is the same historical bundle that previously
  emitted the direct-ledger-only cascade.
- The reentry output still reports historical control-file drift for
  `rb_status.json`, `rb_queue.json`, and `rb_output_declarations.jsonl`.
  Those are independent checkpoint-continuity findings, not return-map or
  reference-authority failures, and remain out of C1 scope.

## Governance Evidence

- `2026-07-30`: `node openspec/governance/check-verification-routing.mjs --change converge-artifact-contract-evaluators --mode assets` passed with `6` valid claims.
- `2026-07-30`: `openspec validate converge-artifact-contract-evaluators --strict` passed.
- `2026-07-30`: `node openspec/governance/check-project-reqs.mjs` passed: `595` registered IDs, `53` retired, `0` orphan, and `681` main-spec/active-delta occurrences.
- `2026-07-30`: `node openspec/governance/check-project-specs.mjs` passed: `79` main spec files and `0` violations.

## Post-Apply Spec Coherence

- `2026-07-30`: archive assessment found stale accepted wording in
  `reference-flat-format`'s Wave1 sub-agent reference-format requirement that
  still prohibited YAML frontmatter. The active delta was extended to reconcile
  that requirement with the same canonical-frontmatter/legacy-read contract
  already implemented and tested; the corresponding main-spec wording was
  synchronized in the same archive-preparation pass.
- `2026-07-30`: `node --test tests/integration/md/parser-aligned-guidance.test.mjs` passed (`5` tests), `openspec validate converge-artifact-contract-evaluators --strict` passed, and both project spec/requirement governance checks remained clean. This is a spec-coherence correction only; it adds no code behavior beyond C1.
