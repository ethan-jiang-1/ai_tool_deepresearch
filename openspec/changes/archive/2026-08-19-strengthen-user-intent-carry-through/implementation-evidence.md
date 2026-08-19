# Implementation Evidence

## Deterministic verification

Focused native tests were run under the task-3.5 command set and passed. The
full regression completed with `2982/2982` tests passing. Workflow package
validation also passed, as did the case-717 static contract and active
experiment-manifest checks.

The final focused spot-check command,
`node --test tests/integration/md/case-717-multi-rerun-intent-contract.test.mjs tests/integration/md/user-intent-carry-through-contract.test.mjs`,
passed with `8/8` tests and `0` failures.

The retained real-Agent Autorun is not a semantic PASS. Its native result is
documented in [case-717-diagnosis.md](case-717-diagnosis.md): the Supervisor
retained `ERROR` after a timed-out Subject result, and no replacement was run.

## Changed surface

The implementation is Agent-facing Markdown guidance in the seven phase or
playbook files under `DEEP_RESEARCH_HARNESS/`, plus existing iterative-
interaction experiment helpers, the case-717 playbook/manifest, and focused
integration/e2e tests. The change also updates the eleven delta specs, their
accepted main-spec owners, the requirement registry, task ledger, and this
evidence/diagnosis record.

No production `.mjs`, schema, Gate, lifecycle state, command, event, receipt,
queue kind, or runtime document was added. Existing helper `.mjs` files were
extended only for the approved Agent Experiment support surface.

## Delta/main comparison

Each of DEW-026, CDP-007, PHS-009, POF-004, PRP-016, RWP-022, STM-009,
URC-004, WAI-012, WTS-013, and REI-007 appears exactly once under its existing
main capability. `openspec validate --specs` reports `82 passed, 0 failed`.
The synchronized main specs contain no delta operation headers. Source
coordinates remain authoritative: baseline versus newest revision versus
history is preserved, and research obligations remain separate from
presentation intent and Engine verdict ownership.

## Semantic closure and residual risk

`semantic-closure.yaml` remains `not_applicable` because this change adds no
new deterministic fact resolver or verdict consumer; its projections are
Agent-authored Markdown guidance and existing human-readable artifact content.
Deterministic tests prove structural/continuity contracts only. Real-Agent
interpretation, multi-rerun semantic fidelity, and user satisfaction remain
unproven because the only authenticated case-717 execution ended in native
`ERROR` at the retained coordinates above.

The user explicitly authorized skipping the long regression for this change.
That skip is recorded as residual risk, not as PASS or NOT_RUN, and both native
ERROR reports remain retained for future diagnosis.

## Evidence coordinates

- Focused test sources: `tests/integration/md/user-intent-carry-through-contract.test.mjs`, `tests/integration/md/case-717-multi-rerun-intent-contract.test.mjs`, `tests/integration/cli/user-research-controls-contract.test.mjs`, `tests/integration/cli/post-final-recovery.test.mjs`, `tests/e2e/rerun-round-continuity.test.mjs`.
- Retained Autorun report: `.exp-bundles/_reports/924de54f-23e8-4618-bb97-419c1bce47cc.json`.
- Second authorized retained Autorun report: `.exp-bundles/_reports/a169d8bf-581e-40b6-a2c8-99dad8255657.json` (also native `ERROR`; no replacement PASS).
- Retained Subject evidence and Supervisor logs: listed in `case-717-diagnosis.md`.
