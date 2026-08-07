---
title: Gate Schema Progressive Gate, Schema, Queue, and Bug Remediation
status: active; Change A v0.75 and Change B v0.76 archived 2026-08-07; Phase 3 observation pending
created: 2026-08-07
---

# Gate Schema: Progressive Gate / Schema / Queue Remediation

> Long-horizon coordination plan for turning the Gate / Schema / Queue audit
> into bounded OpenSpec changes. This plan is an execution map, not behavior
> authority. Accepted specs, executable contracts, and selected runtime bundles
> remain the sources of record.

## Purpose

This work does **not** aim to add more Gates, make the Engine judge research
quality, or rewrite all 10 Gates / 122 rules. Its purpose is to close the
smallest deterministic Agent <-> Engine loops exposed by current evidence:

```text
current producer contract
  -> one authoritative evaluator
  -> smallest direct root
  -> one legal repair or honest no-path
  -> rerun the same checkpoint
```

The three audit questions remain the design test for every blocking obligation:

1. Can the owning Agent construct legal input at the decision point?
2. Do authority, schema, definition, admission, inspect, and Gate mean the same thing?
3. Does a failure converge to one legal next action or an honest terminal boundary?

The target is therefore producer closure (G1), one-truth-path closure (G2),
and bounded recovery closure (G3), not a generic "stronger schema" program.

## Inputs and Boundaries

This plan coordinates, but does not replace:

- [Gate / Schema / Queue Capability Audit](gate-schema-capability-audit.md)
- [BUG-200--204 Gate and Queue Contract Remediation](bug-200-204-gate-and-queue-remediation.md)
- [audit evidence base](gate-schema-capability-audit/evidence-base.md)
- [observation protocol](gate-schema-capability-audit/observation-protocol.md)

No target-code edit is authorized by this document. Every behavior change
follows `propose -> review -> apply -> archive`; proposal/explore writes only
under `openspec/changes/`.

## Current-Head Baseline

The following are direct current-head observations, not historical-frequency
claims:

| Area | Direct fact | Consequence |
|---|---|---|
| Gate audit authority | `engine/gate-skeleton` both rejects a permanent per-rule catalog and later requires one. The executable audit implements the no-second-catalog branch. | Reconcile the accepted spec before treating the audit as a complete baseline. |
| Wave1 semantic sections / BUG-201 | The real Wave1 Gate accepts lower-case, reordered, and differently levelled headings. Runtime dispatch uses the semantic-section evaluator, although definition metadata still says `pattern_match` with an old ordered regex. | Do not weaken the Gate. Remove the metadata/evaluator truth-path drift. |
| Submitted evidence / BUG-202 | Existing Gate and inspect regressions fail closed for missing submitted coverage and mask dependent symptoms behind the parent authority root. | Add the exact no-submitted-work-unit case before closing BUG-202; never fabricate `reviewed_work_unit_refs[]`. |
| Queue failure / BUG-203 | A real Engine-path observation fails a generated repair item a second time and produces `repair-repair-*`. `QueueFailureSchema` permits an optional arbitrary repair item and `fail()` generates one when absent. | P0: create a finite successor/no-path contract before other recovery work relies on Queue failure behavior. |
| Terminal recovery / BUG-204 | Six terminal regressions share a stale candidate fixture: current `wave0_source_intake` accepts only `source_yaml`, while the fixture declares an unassigned `reference` output. Late-submit correctly rejects it. | First align the fixture with the immutable current assignment contract; do not relax output schema, hash, or snapshot protections on this evidence. |

Baseline verification run on 2026-08-07:

```sh
node --test \
  tests/schema/gate-rule-audit.test.mjs \
  tests/engine/queue-manager-window-lifecycle.test.mjs \
  tests/integration/cli/check-gate-wave1-complete.test.mjs \
  tests/engine/work-unit-terminal.test.mjs \
  tests/engine/work-unit-attempt-recovery.test.mjs
```

Result: 77 passed, 6 failed. All six failures were in the terminal
late-submit / timeout-preflight fixture path above. The Queue recursive-repair
observation is a real Engine invocation over a generated valid Queue, not a
hand-written runtime snapshot.

## Non-Negotiable Guardrails

- Keep strict schema, receipt, ledger, identity, hash, and provenance checks.
- Keep semantic source credibility, claim truth, and evidence sufficiency with
  the Agent/HITL; never turn them into generic Engine Gates.
- Prefer a direct evaluator and one root over a second validator, a derived
  status, a generic repair controller, or a retry tree.
- A legal repair must pass its own preconditions. Otherwise feedback names the
  owner, terminal boundary, or missing contract.
- Tests prove Engine behavior. Only retained real `agent_flow_e2e` observation
  can prove Agent adherence.
- Do not create a third implementation change from historical similarity,
  static rule count, prompt text, fixtures, or a `NOT_RUN` result.

## Progressive Roadmap

### Phase 0: Evidence and Proposal Readiness

**Goal:** establish the smallest trustworthy baseline before target edits.

- [x] Record the Gate-audit authority meta-contract conflict and select its
  disposition. The default candidate is the existing derived audit branch:
  schema-parsed definitions plus behavioral evaluator tests, with no permanent
  second per-rule catalog. The candidate is captured in Change B's proposal,
  design, and `GSK-011` delta; it becomes accepted only through that change's
  apply/archive lifecycle.
- [x] Build consumer matrices for the four obligations touched below: Queue
  failure successor, Wave1 semantic-section contract, submitted evidence / depth
  review, and terminal late-submit / timeout preflight. The two proposals and
  designs now name direct authority, producer, evaluator consumers, and legal
  repair/no-path for their in-scope obligations.
- [x] Keep static delivery, deterministic Engine behavior, and real Agent flow
  as separate proof fields in each observation. Both change-owned verification
  plans select deterministic proof only and explicitly exclude Agent-flow
  claims; Phase 3 retains the real-Actor observation obligation.
- [x] Create two capability-discovery records in their OpenSpec proposals;
  discovery must confirm final capability deltas rather than trusting this
  document's names.

**Exit condition:** the change proposals can name direct authority, producer,
all relevant evaluator consumers, current legal repair/no-path, and a focused
regression for each touched obligation.

### Change Execution Record (2026-08-07)

| Ordered change | Archive result | Next lifecycle boundary |
| --- | --- | --- |
| `remove-recursive-queue-failure-repair` | archived as `2026-08-07-remove-recursive-queue-failure-repair`; `v0.75` | retain as accepted Queue terminal boundary; proceed to Phase 3 observation |
| `align-gate-contract-descriptors-and-terminal-recovery-tests` | archived as `2026-08-07-align-gate-contract-descriptors-and-terminal-recovery-tests`; `v0.76` | retain accepted descriptor/audit/depth/terminal behavior; proceed to Phase 3 observation |

Both change task ledgers, delta/main-spec synchronization, feedback closeout,
and governed archive transitions are complete. This tracker still does not
authorize target-code edits; a third implementation change remains subject to
the trigger below.

### Change A: `remove-recursive-queue-failure-repair`

**Why first:** BUG-203 is a current P0 bounded-recovery defect. Its unbounded
side effect can obscure or multiply later Gate/recovery failures.

**OpenSpec scope:** `agent/agentic-queue`, with only necessary relationships to
`agent/delegated-work-units` and `workflow/repair-loop`.

**Design constraints:**

- Failure must remain durably recorded in terminal history.
- `fail()` may insert a successor only when the Engine can prove a current,
  executable, finite repair or replacement path.
- A repair item may not manufacture another generic repair item. A delegated
  attempt must use existing terminal/replacement authority, not Queue's generic
  repair path.
- When no successor is legal, Queue check/inspect/Gate must expose the direct
  failure and honest no-path state without unsafe preemption or hand edits.
- The design may introduce a typed failure disposition only if it replaces the
  current optional-arbitrary-repair ambiguity. It must not create a new generic
  lifecycle controller or derived success authority.

**Required red/green regressions:**

- [x] failure of an ordinary unclaimable/non-delegated item terminates without a
  recursive successor;
- [x] a repair item that fails again has no `repair-repair-*` descendant;
- [x] a delegated failure retains its existing audited replacement/terminal
  route;
- [x] queue inspection, rendered projection, and Gate-facing diagnostic agree
  on the resulting root and legal next action;
- [x] no mutation occurs when successor admission is invalid.

**Exit condition:** repeated `fail` calls have a deterministic finite bound,
with no competing repair authority or provenance bypass.

### Change B: `align-gate-contract-descriptors-and-terminal-recovery-tests`

**Why second:** this change removes G2 truth-path drift and restores accurate
terminal-recovery evidence after Queue failure behavior is bounded. It does
not presume that production schema/hash behavior is wrong.

**OpenSpec scope candidates:** `engine/gate-skeleton`,
`research/research-wave-gate-implementation`,
`engine/check-inspect-feedback`, `agent/delegated-work-units`, and
`agent/work-unit-provenance-gate`. Capability discovery decides the final set.

**Work items:**

- [x] Reconcile the mutually exclusive Gate-audit clauses in the accepted
  `gate-skeleton` spec with the chosen derived-audit model and executable test.
- [x] Align `question_list_has_four_sections` definition metadata with the
  existing direct semantic evaluator. The chosen representation must remove the
  rule-ID/old-regex ambiguity rather than add a duplicate parser. A typed
  direct-output-contract descriptor is acceptable only if it replaces the
  special case and has a clear schema/evaluator meaning.
- [x] Lock BUG-201 with a real Gate-path regression: equivalent heading case,
  order, level, and spacing pass; a missing or empty required section fails
  once with the direct semantic root.
- [x] Add the exact BUG-202 case where no submitted work unit can supply a
  review reference. It remains fail-closed and reports submitted-evidence or
  legal replacement/no-path before depth-review derivative symptoms.
- [x] Make terminal test candidates derive their allowed output roles from the
  current attempt contract. For current Wave0 attempts this means the assigned
  `source_yaml` contribution, not an unassigned `reference` output.
- [x] Rerun the six previously red late-submit / timeout-preflight tests. Only
  a remaining red result may justify examining terminal snapshot, full hash, or
  schema behavior.

**Exit condition:** definition metadata, runtime dispatch, direct evaluator,
inspect, formal Gate, test fixture, and accepted spec tell one compatible
story; valid presentation remains tolerated and provenance remains fail-closed.

### Phase 3: Bounded Observation and Follow-Up

After both changes, continue the six-obligation observation program from the
audit rather than treating implementation completion as proof of Agent
adherence.

**Current status:** deterministic Engine evidence for Changes A/B is complete;
real Agent-flow observation remains unrun and is the next long-horizon work.

- [ ] Record static delivery, deterministic Engine behavior, and real Agent
  flow separately for every sampled obligation.
- [ ] Classify H1-H4 as supported, weakened, or unresolved from current-head
  evidence.
- [ ] Feed prompt/control-surface findings back as decision-point contract
  projection and structured-root consumption, not additional static prose.

### Third-Change Trigger

A third implementation change is allowed only when all conditions hold:

1. current-head direct evidence shows a P0 or P1 mechanism;
2. the mechanism is not covered by accepted authority or either change above;
3. a focused, deterministic Engine-path regression can go red; and
4. the proposal identifies a simpler direct authority/evaluator path than a
   generic controller, retry tree, or new completion state.

The only separately named product-semantic trigger remains
`explicit-deferred-topic-closure`: an explicit product decision that a topic
without submitted evidence may legally enter Wave2 or Final. It is not a
BUG-202 workaround and requires its own HITL/provenance proposal.

## Bug Disposition Ledger

| Bug | Current disposition | Closing evidence required |
|---|---|---|
| BUG-200 | current-head covered / no new change | retain existing projection regression evidence |
| BUG-201 | closed in Change B / `v0.76` | typed descriptor, tolerant-presentation, missing/empty-section Gate and inspect regressions |
| BUG-202 | closed in Change B / `v0.76` | one current-Topic submitted-backing root, masked floor derivative, `missing_contract` no-path regression |
| BUG-203 | closed in Change A / `v0.75` | finite `fail` lifecycle, terminal no-successor, and no-mutation regressions |
| BUG-204 | reclassified and closed in Change B / `v0.76` as stale terminal fixture contract drift | assignment-derived candidate makes the former terminal role-drift cases pass while strict Engine protections remain |

## OpenSpec Operation Order

```text
Phase 0 evidence / capability discovery
  -> propose Change A and Change B
  -> review both proposals
  -> apply + archive Change A
  -> apply + archive Change B
  -> Phase 3 observation
  -> third change only when its trigger is met
```

The two proposals may be prepared in parallel. Apply remains sequential: Queue
failure convergence first, then Gate/terminal alignment. During each apply,
new high-confidence findings become ordinary pending tasks and relevant delta
spec updates before final verification and archive.

## Completion Definition

This plan can move to `_done/_closed_plans/` only when:

- Change A and Change B each complete the full OpenSpec lifecycle;
- BUG-200--204 have an explicit close, reclassification, or retained external
  boundary backed by current evidence;
- the Gate-audit authority conflict has one accepted disposition;
- all six audit obligations have consumer matrices and separate proof-class
  accounting; and
- any residual Agent/host uncertainty is honestly retained as `NOT_RUN` or
  `UNOBSERVED`, not claimed as fixed.
