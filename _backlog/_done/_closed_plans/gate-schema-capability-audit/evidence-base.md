# Gate / Schema / Queue Audit Evidence Base

> Supporting evidence for the overall
> [`gate-schema-capability-audit.md`](../gate-schema-capability-audit.md). This file records
> evidence discipline, current-head facts, representative historical mechanisms, and the
> deterministic/semantic boundary. It does not set implementation scope.

## Evidence Discipline

### Historical records are a candidate pool, not frequency proof

This audit uses resolved records dated `2026-07-24` through `2026-08-05`. The resolved table in
[`fixed_bugs/README.md`](../../../_done/_fixed_bugs/README.md) contains **81 records** in that window,
but it mixes implemented fixes, current-head no-reproduction, external/host residuals, and
current-head unobserved cases. The number 81 describes the screening pool only. It does not mean
there were 81 instances of one mechanism or that all 81 defects still exist.

| Evidence type | Supports | Does not support |
|---|---|---|
| current-head code, executable regression, accepted spec | Current contract, reproducible behavior, authority boundary | Real Agent adherence on an unexecuted path |
| direct fact from a resolved incident | Historical mechanism and recurrence candidate | The same defect still exists on current head |
| no-reproduction, external residual, `NOT_RUN`, unobserved | Missing behavior evidence or an external boundary | Current violation, successful remediation, or host compliance |

Mechanism clustering uses representative records with a direct fact or accepted fix. For example,
BUG-192 and BUG-198 support an observation gap, not a claim that current-head Agents still violate
the relevant instruction.

## Current-Head System Facts

### Gate inventory is descriptive only

Static reading of current definitions on 2026-08-07 gives:

| Descriptive count | Value |
|---|---:|
| active Gates | 10 |
| rules | 122 |
| definition-declared `pattern_match` | 10 |
| `finding.source: checker` | 53 |
| definition-owned | 69 |

These numbers do not measure validation depth. `question_list_has_four_sections` is the decisive
counterexample:

- its [Gate definition](../../../../DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-wave1-complete.definition.json)
  still declares `pattern_match` and carries a fixed regex;
- [runtime dispatch](../../../../DEEP_RESEARCH_HARNESS/engine/helpers/wave-contract-evaluators.mjs)
  routes that rule ID to `evaluateDirectOutputTarget`;
- the [direct-output evaluator](../../../../DEEP_RESEARCH_HARNESS/engine/helpers/direct-output-contract.mjs)
  uses the shared [semantic-section parser](../../../../DEEP_RESEARCH_HARNESS/engine/helpers/markdown-semantic-sections.mjs),
  tolerates heading case/level/whitespace, and requires non-empty section bodies.

Therefore a regex in definition metadata does not prove regex-only runtime behavior. This fact does
not by itself close BUG-201; that needs a regression through the real Gate path. It proves that an
audit must separately record declared metadata, actual dispatch/evaluator, Agent-facing projection,
all callers, deterministic regression, and real-Agent observation. Stale or dead metadata is a drift
signal, not a behavioral bug without path evidence.

### Accepted Gate-audit authority is internally inconsistent

The accepted [`gate-skeleton` spec](../../../../openspec/specs/engine/gate-skeleton/spec.md) currently
contains mutually exclusive instructions inside the same requirement:

- its main text and `Duplicate rule catalog is not required` scenario prohibit a second
  rule-granular producer/authority/checker/repair/test catalog;
- later scenarios still require `artifact contract inventory`, `closure inventory`, and expansion
  of grouped design rows into a maintained per-rule inventory.

The executable [`gate-rule-audit`](../../../../tests/schema/gate-rule-audit.test.mjs) implements the
derived-audit branch and explicitly checks that retired rule-granular catalogs do not remain. A
passing implementation test shows which branch current code follows; it cannot reconcile conflicting
accepted authority. This is current direct evidence for G2 and must be dispositioned before that spec
is used as a complete audit baseline.

### Queue failure successor is currently unbounded

[`queue-manager-lifecycle.mjs`](../../../../DEEP_RESEARCH_HARNESS/engine/queue-manager-lifecycle.mjs)
selects `parsedFailure.repair || makeRepairItem(parsedFailure)` for every schema-valid current-item
failure and unconditionally inserts that successor through `preempt` or `enqueue`. There is no
ancestor, depth, or executable-path stop condition in `fail()`.

[`queue-manager-window-lifecycle.test.mjs`](../../../../tests/engine/queue-manager-window-lifecycle.test.mjs)
proves one generic repair is created. It does not prove repeated repair failure terminates. This is
the current direct fact behind BUG-203; its implementation remains owned by
`remove-recursive-queue-failure-repair` in the existing remediation plan.

## G1 Evidence: Producer Closure

G1 exists when an executable contract is known to the validator but is unavailable, late, dispersed,
or non-authoritative at the actual authoring/submit/transition decision point.

| Incident | Direct historical fact | Mechanism exposed |
|---|---|---|
| [BUG-115](../../../_done/_fixed_bugs/BUG-115-work-unit-result-schema-unconstructable.md) | 12+ constraints were spread across files; seven dry-submit attempts | Validator contract was not projected at first authoring |
| [BUG-120](../../../_done/_fixed_bugs/BUG-120-wave1-ref-metadata-fields-undocumented.md) | About 40 references went through four whole-batch rewrites | Authoring-time schema closure arrived after expensive production |
| [BUG-102](../../../_done/_fixed_bugs/BUG-102-seed-topic-yaml-validation-at-gate-not-authoring.md) | Malformed YAML reached the terminal Gate | Rejection was too far from the owning authoring action |
| [BUG-153](../../../_done/_fixed_bugs/BUG-153-operate-topic-state-opaque-validation.md), [BUG-158](../../../_done/_fixed_bugs/BUG-158-operate-topic-state-context-dependent-schema.md) | Agent needed Engine source to discover rejected fields or contextual shape | Public producer surface did not expose legal input |
| [BUG-173](../../../_done/_fixed_bugs/BUG-173-cache-trail-requirements-undocumented.md) | Correct contract appeared after 40+ lines of boilerplate and was missed | Contract presence was not decision-point delivery |
| [BUG-194](../../../_done/_fixed_bugs/BUG-194-wave1-assignment-mode-payload-location.md) | Rejection named legal values but not `/payload/assignment_mode` | Feedback lacked an exact write coordinate |

The accepted [`delegated-work-units` spec](../../../../openspec/specs/agent/delegated-work-units/spec.md)
provides a positive pattern: after claim, generated `task.md` renders `Completion Contract` as the
first authoring entry, derived only from current attempt authority. The current renderer is in
[`work-unit-envelope.mjs`](../../../../DEEP_RESEARCH_HARNESS/engine/work-unit-envelope.mjs), with a focused
[`work-unit-contract-constructibility` integration test](../../../../tests/integration/engine/work-unit-contract-constructibility.test.mjs).
This proves static delivery for that surface, not adoption at every phase/handoff/recovery decision or
real Agent first-return adherence.

## G2 Evidence: One-Truth-Path Closure

G2 exists when one obligation is interpreted independently by definitions, schemas, writers,
admission, claim, inspect, Gate, persistence, or projections.

| Incident or current fact | Direct fact | Mechanism exposed |
|---|---|---|
| [BUG-125](../../../_done/_fixed_bugs/BUG-125-queue-payload-validation-at-claim-not-enqueue.md) | Enqueue accepted, claim rejected, Queue check reported healthy | Admission, claim, and health lacked one demand evaluator |
| [BUG-141](../../../_done/_fixed_bugs/BUG-141-wave0-gate-contradictory-passed.md) | `passed: true` coexisted with non-empty `failed_rule_ids` | Summary and findings had separate verdict paths |
| [BUG-146](../../../_done/_fixed_bugs/BUG-146-wave0-reference-return-map-contract-collision.md), [BUG-162](../../../_done/_fixed_bugs/BUG-162-wave1-artifact-return-map-parser-collision.md) | Return-map grammar was applied to rich reference/evidence artifacts | Parser scope was not bound to artifact role |
| [BUG-172](../../../_done/_fixed_bugs/BUG-172-reference-yaml-frontmatter-rejected.md) | Writer format and parser presentation drifted | Producer and consumer copied format meaning |
| [BUG-185](../../../_done/_fixed_bugs/BUG-185-index-ledger-dual-hash-storage.md) | Ledger and index both stored current hash and diverged | Projection became a second authority |
| BUG-201 current inspection | Definition metadata, runtime dispatch, and pure evaluator differ | Static inventory cannot represent executable behavior |
| accepted Gate-audit authority | One accepted requirement contains opposing catalog obligations | Normative authority itself has two truth paths |
| BUG-204 triage | Historical schema/hash conflict is not proven on a real current Engine path | Historical narrative cannot select a current contract change |

The accepted [`queue-input-validation` spec](../../../../openspec/specs/agent/queue-input-validation/spec.md)
is the target shape for Queue demands: enqueue, check, claim, and stale repair share one evaluator.
For Gate audit, the target shape is the derived contract implemented by the current test, but the
accepted spec conflict above prevents treating it as a clean baseline until reconciled.

## G3 Evidence: Recovery Closure

G3 exists when failure detection does not yield one reachable, finite nearest action or an honest
owner/external/user-decision/missing-contract/terminal boundary.

| Incident or current fact | Direct fact | Mechanism exposed |
|---|---|---|
| [BUG-109](../../../_done/_fixed_bugs/BUG-109-wave1-gate-excessive-rule-coupling.md) | One missing parent produced 35+ masked symptoms | Feedback lacked prerequisite-aware root compression |
| [BUG-124](../../../_done/_fixed_bugs/BUG-124-shared-ref-agent-action-hint-misleading.md) | Hint directed a Phase Agent to write a file the Gate classified as delegated bypass | Recommended repair violated the same authority contract |
| [BUG-153](../../../_done/_fixed_bugs/BUG-153-operate-topic-state-opaque-validation.md), [BUG-171](../../../_done/_fixed_bugs/BUG-171-claim-actor-reason-code-opaque.md) | Deterministic conflict was hidden behind generic prose | Structured root was not the first consumption surface |
| [BUG-176](../../../_done/_fixed_bugs/BUG-176-seed-projection-entry-ref-validation.md) | One filename mismatch cascaded into multiple projection failures | Dependent symptoms appeared as independent repairs |
| [BUG-177](../../../_done/_fixed_bugs/BUG-177-timeout-preflight-ambiguous-recommendations.md) | Recommendations disagreed and did not expose their basis | Recovery selection had multiple truth paths |
| [BUG-180](../../../_done/_fixed_bugs/BUG-180-no-legal-submitted-repair-path.md), [BUG-181](../../../_done/_fixed_bugs/BUG-181-queue-terminal-no-reactivate.md), [BUG-182](../../../_done/_fixed_bugs/BUG-182-uncommitted-tx-blocks-gate.md) | No sanctioned successor/recovery existed; operators edited or deleted Engine-owned state; BUG-180 touched four Engine-owned files | System rejected without a legal successor or honest no-path |
| BUG-202 triage | Missing submitted evidence should precede depth-review symptoms | Root must remain missing submitted evidence and fail closed |
| BUG-203 current code | Every legal failure inserts a supplied or generic repair successor | Missing stop condition permits recursive repair descendants |
| BUG-204 triage | Terminal late-submit/timeout needs a real Engine-path counterexample | Impossible hand-built snapshots cannot decide recovery contract |

The accepted [`check-inspect-feedback` spec](../../../../openspec/specs/engine/check-inspect-feedback/spec.md)
already requires the smallest independent actionable roots, explicit `repair_kind`, `missing_fact`,
`write_to`, and `rerun`, validation of recommended operations through their own preconditions, and an
honest boundary when no legal action exists. G3 is therefore first an adoption, conformance, and
observation problem; it is not evidence for a new generic repair controller.

## Deterministic Backing Is Not Semantic Truth

The boundary follows [`CONTEXT.md`](../../../../CONTEXT.md) and the project charter:

| Engine can verify deterministically | Agent/HITL must judge |
|---|---|
| parse/schema, fields, state, attempt identity, hash, receipt, submitted provenance | source credibility, claim truth, evidence sufficiency, effect of counterevidence |
| a declared finding binds existing legal submitted backing | the backing actually supports the finding |
| URL syntax/declaration and reproducible provenance | authority, correct reading, and meaning of a transient network failure |
| mechanical preconditions of a root and transition/operation | new semantic, risk, or product decisions |

[BUG-199](../../../_done/_fixed_bugs/BUG-199-synthesis-no-evidence-citations.md) exposed a deterministic
gap: a polished Final report could contain no evidence link. The accepted
[`Final Evidence Map`](../../../../openspec/specs/research/final-delivery-backing/spec.md) binds selected
key findings to declared submitted backing; semantic adequacy remains Agent/human judgment. The
Agent-facing controls are [phase-final.md](../../../../DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-final.md)
and [persist-artifact.md](../../../../DEEP_RESEARCH_HARNESS/command_playbook/persist-artifact.md).

Live URL reachability, source truth, claim truth, and semantic support must not be disguised as stable
deterministic Gates. This boundary crosses G1-G3; it is not a fourth, stronger checker class.
