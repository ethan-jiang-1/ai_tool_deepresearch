---
title: Gate Schema Progressive Gate, Schema, Queue, and Bug Remediation
status: closed; product remediation and the bounded Phase 3 observation record are complete. Cases 224 and 225 remain quarantined as extreme-slow assets pending an independent refactor-or-remove decision; historical static/native boundaries and unresolved H1-H4 research claims are retained without becoming open remediation work
created: 2026-08-07
updated: 2026-08-07
---

# Gate Schema: Progressive Gate / Schema / Queue Remediation

> Long-horizon coordination plan for turning the Gate / Schema / Queue audit
> into bounded OpenSpec changes. This plan is an execution map, not behavior
> authority. Accepted specs, executable contracts, and selected runtime bundles
> remain the sources of record.

## Current Execution Status

Changes A and B are archived as `v0.75` and `v0.76`; their scoped deterministic
Engine regressions and governance checks are complete. Phase 3 retains separate
static, deterministic, and real-Agent/host accounting for all six audit
obligations. One narrow real Subject-Agent recovery observation passed.

Case 225 has now exposed two playbook-local facts, neither of which is an
accepted Engine or Queue defect: an unavailable required child was once
misclassified as `FAIL` instead of the declared `NOT_RUN`, and a later real,
available child produced semantically correct submit/materialization/inspect
facts but used ambiguous case-local JSON field names. The focused static
contract is fast and useful as a producer/reader regression, but the heavy
real-Agent playbook is not economical as a repeated remediation test: a normal
run nests a Headless Playbook Agent, a Subject Agent with a 12-minute limit,
one real child, real search/fetch, submit, materialization, and inspect. The
last rerun was cancelled by explicit user direction after 515.509 seconds and
has no native completion. Case 225 is therefore quarantined in
`experiments_playbook/exp_extrem_slow/`: it is not a diagnostic or acceptance
asset and must not run. It may return only after a separately proposed refactor
makes its cost and latency proportionate, moves it to a supported runnable
tier, and explicitly re-registers it; otherwise it is removed. This does not
create a broad adherence, constructibility, or convergence claim.

All plan completion conditions below are met. No third-change trigger is
currently established. Any future Case 224/225 refactor or removal is a new,
independent decision and is not pending work under this closed plan.

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
the six-obligation observation accounting and H1--H4 disposition are recorded
below. The retained observations support only their named proof boundaries;
they do not authorize a third implementation change.

#### Phase 3 Deterministic Fixture Alignment (2026-08-07)

The expanded current-head deterministic baseline found one missed fixture
alignment from Change B: the malformed supersession-relation scenario in
`tests/e2e/work-unit-attempt-recovery.test.mjs` still selected retired
`reference/*.md` output. The current claimed Wave0 assignment instead owns
the manifest tuple `artifacts/wave0/topic-a/source.yaml` / `source_yaml`; the
retired glob matched no files and correctly produced an inapplicable PASS
before relation integrity could be observed.

The corrective change is archived as
`2026-08-07-align-supersession-root-masking-fixture`; it now derives that
scenario's path and role selectors and its orphan expectation from
`manifest.output_contract.required_outputs` before corrupting the relation.
The isolated malformed-relation regression and the complete recovery E2E file
passed (1 matching test and 19/19 respectively), with output coverage,
submission presence, and inspect retaining the same `ledger_invalid` root.
This is deterministic fixture drift, not a new schema, Gate, Queue, or
production recovery mechanism; it does not satisfy the third-change trigger.

The fixture correction above is not itself Agent-flow evidence. The separate
queue-failure native run below resolves `NOT_RUN` for that one fixture-backed
deterministic claim only; it does not establish Subject Agent adherence.

#### Phase 3 Queue Failure Playbook Alignment (2026-08-07)

The active `align-queue-failure-experiment-fixture` change aligns
`case-43-standard-failure-repair` with accepted AGQ-019. Its registered V2
frontmatter and Step 2.5 now name `failure_terminal_no_successor`; the
playbook consumes the Queue returned by the existing `fail()` API, checks the
failed row's terminal disposition, scans `active_window`, `refill_pool`, and
`Object.values(delegated_in_flight)` for repair descendants, and verifies that
the pre-existing next demand is promoted. It adds no Queue evaluator, runtime
state mutation shortcut, Agent-recovery route, or accepted behavior change.

| Proof boundary | Status | Retained evidence and limit |
| --- | --- | --- |
| Static fixture delivery | complete | The registered Markdown asset, its `required_checks`, and Step 2.5 state one terminal/no-successor fact; `check-verification-routing --mode assets` accepts the selected `agent_flow_e2e` asset. |
| Deterministic Queue behavior | PASS | The focused AGQ-019 lifecycle regression `terminalizes generic failure without a repair successor or preemption` passes against the current Engine. |
| Autorun selection / preflight | PASS (non-native) | Exact-case `--dry-run --json` selects `case-43-standard-failure-repair`; it establishes registration and preflight only, not playbook execution or a case verdict. |
| Real Playbook-Agent native completion | PASS (native) | Normal Autorun batch `fd230ca9-f5aa-4300-b0f3-096b93c84e13` executed exactly this case under the user-authorized `$15` cap; its validated completion has `PASS`, 6/6 expected checks, a valid 21-event verdict trace prefix, `CLEAN` health, and `$0.398909` actual cost. |
| Subject Agent adherence / H1--H4 | unresolved / not claimed | The executed case declares `proof_subject: deterministic_contract` and `subject_execution: none`; its Playbook-Agent completion cannot classify the wider six-obligation program or prove Subject behavior. |

This closes the scoped native completion for the existing AGQ-019
fixture/proof-asset alignment, not a third product implementation change.

#### Phase 3 Current-Head Observation Ledger (2026-08-07)

The three columns below are deliberately non-substitutable. `NOT_RUN` in the
static column means no independent static delivery audit was retained; a native
source/rendered-byte binding is useful provenance but does not turn into that
audit. `UNOBSERVED` in the real-Agent column means no Subject-Agent behavior
claim is available, even where the Headless Playbook Agent completed a
fixture-backed case.

| Obligation | Static contract delivery | Deterministic Engine behavior | Real Agent / host observation | Current-head disposition |
| --- | --- | --- | --- | --- |
| work-unit direct output + dry-submit | NOT_RUN; case-164's native revalidation binds current source and rendered bytes, but is not a separate competing-copy audit | PASS; case-164's five native checks cover semantic rejection, preserved first output hashes, fresh primary replacement, independent second child, and replacement-only submit | PASS; batch `ac3744e2-c17a-48a5-b938-b7fd440306d6` retained one real Subject Agent, two real children, real search/fetch, 26 valid trace events, and six durable evidence roles | Narrow real recovery evidence only; it does not measure first-read projection or universal adherence. |
| Queue payload executable demand | NOT_RUN; no independent static decision-point audit | PASS; case-404 native completion covers all six Queue authority checks; current `queue-manager-window-lifecycle` regressions also pass | UNOBSERVED for Subject behavior because `subject_execution: none`; the Headless Playbook-Agent native case passed | Queue authority boundary is evidenced; no Subject routing claim. |
| Wave1 semantic-section contract | NOT_RUN; no retained first-read decision-point observation | PASS; current `check-gate-wave1-complete` tests accept equivalent headings and fail one empty required section with the direct root; direct adapter parity also passes | UNOBSERVED; batch `2f5ef77e-686d-4f74-ac93-3e6f763b7665` ended `ERROR: agent_timeout` without native completion | Engine evaluator parity is current-head evidence; host timeout is not a semantic-section failure. |
| submitted evidence + depth review | PASS for the Case 225 producer/reader contract; focused assertions now bind the canonical Topic UID, explicit path-index keys, and Engine-index work identity | PASS; current Wave1 regressions cover missing canonical submitted coverage, one current-topic submitted-backing root, and submitted repair/review convergence | batch `55d4273e-c0b1-4bcc-99b8-35ef55818a9c` passed closeout/inspect after the first reader repair; batch `e98ab2dc-e863-44a1-b007-cdab47567496` then showed real child, submit, materialization, and inspect but a case-local summary-key mismatch; the repaired rerun `2f54ae68-ab65-4dae-916b-3928a8ab1080` was externally cancelled before native completion | Submitted closeout is observed in bounded runs; Case 225 is quarantined and not runnable, while no uncompleted/cancelled run proves independent-child behavior. |
| terminal failure / repair successor | PASS; case-43's registered asset passed verification-routing and its rendered terminal/no-successor fact is retained | PASS; AGQ-019 lifecycle regression and case-43's 6/6 native checks show terminal failure without repair descendants or preemption | UNOBSERVED for Subject behavior because `subject_execution: none`; native Playbook-Agent completion passed | Finite Queue recovery boundary is evidenced; it is not a general Agent convergence claim. |
| Final selected-finding backing | NOT_RUN; no registered Final Subject-Agent observation was found | PASS; current `final-delivery-backing` regressions accept only structural links to submitted backing and reject failed/filesystem-only substitutes | UNOBSERVED; no exact Final backing case exists; related Wave2 triage batch `9b088dca-7b9e-492d-a549-1237f75465df` finalized native `NOT_RUN` before Subject/search execution | Final backing remains a structural Engine contract; semantic support remains Agent/HITL-owned. |

| Case | Batch | Authoritative result | Proof boundary / retained limit | Actual cost (USD) |
| --- | --- | --- | --- | ---: |
| `case-43-standard-failure-repair` | `fd230ca9-f5aa-4300-b0f3-096b93c84e13` | native PASS, CLEAN | fixture-backed Queue terminal boundary; no Subject execution | 0.398909 |
| `case-164-heavy-direct-output-candidate-contract` | `ac3744e2-c17a-48a5-b938-b7fd440306d6` | native PASS, CLEAN | setup-only fixture plus one real Subject Agent and two real children | 6.007484 |
| `case-225-heavy-returned-work-closeout` | `f0e6d196-e0af-4e77-94af-7de4ca08753f`; `301f8362-bb7e-43c0-9669-260392759c16`; `55d4273e-c0b1-4bcc-99b8-35ef55818a9c`; `e98ab2dc-e863-44a1-b007-cdab47567496`; `2f54ae68-ab65-4dae-916b-3928a8ab1080` | `ERROR: agent_timeout`; `FAIL` (reader field); `FAIL`, ISSUES (required child unavailable); `FAIL`, ISSUES (case-local summary keys); `CANCELLED` (`external_sigint`, no native completion) | the third run proves a legal unavailable fallback, the fourth proves real child/submit/materialization/inspect but exposes untyped summary drift, and the fifth was stopped after 515.509 s under the user-directed latency boundary; the current asset is quarantined rather than repeatedly retried | 1.791163; 0.460498; 0.405742; 0.428978; 0.203129 |
| `case-232-heavy-finding-triage` | `9b088dca-7b9e-492d-a549-1237f75465df` | native NOT_RUN, ISSUES | Subject runtime or real external search unavailable; not Final behavior evidence | 0.254446 |
| `case-404-standard-queue-boundary` | `eb8bf367-b4fb-4388-aec8-f656f41cdef9` | native PASS, ISSUES | six Queue checks and 33 valid trace events; heavy health profile reports unrelated Gate/ledger/cache/source surfaces | 0.283594 |
| `case-224-light-happy-and-fail` | `2f5ef77e-686d-4f74-ac93-3e6f763b7665` | `ERROR: agent_timeout` | no native completion; host boundary, not a Wave1 contract verdict | 5.885755 |

The `$200` continuation authorization has consumed `$15.720789` for case-164,
225, 232, 404, and 224, leaving `$184.279211`; the earlier case-43 cost was
authorized under its separate `$15` cap and is shown only for complete evidence
history. Current-head verification before the user-directed Case 225 quarantine passed all
52 tests in `check-gate-wave1-complete`, `final-delivery-backing`, and
`queue-manager-window-lifecycle`; the focused Case 225 producer/reader
contract subsequently passed 8/8, but that static result is not real-Agent
proof.

| Hypothesis | Classification | Current evidence boundary |
| --- | --- | --- |
| H1 decision-point projection improves constructibility | unresolved | case-164 proves one real recovery, but there is no controlled projection comparison, first-read metric, or rejection-distance baseline. |
| H2 one authority/evaluator reduces drift | unresolved beyond sampled Engine mechanisms | Wave1 descriptor parity, submitted-backing root parity, and Queue authority checks support the local mechanism; no cross-obligation outcome comparison is retained. |
| H3 root-first legal feedback improves convergence | unresolved beyond sampled recovery paths | case-43 bounds generic Queue failure and case-164 completes one explicit replacement, but there is no repair-turn or manual-edit baseline. |
| H4 adherence risk concentrates at authority changes | unresolved | case-164 succeeds at one authority change; case-224 timed out; Case 225 retained both one unavailable fallback and one real child/closeout summary drift before its latest run was cancelled; and case-232 is native NOT_RUN, so no comparative concentration claim is possible. |

The Case 225 reruns do not meet the third **product implementation** trigger:
Queue admission, work-unit submit, Phase closeout, and inspect all retain their
accepted authority. Two no-spec-delta playbook follow-ups applied their static
repairs but are superseded by the extreme-slow quarantine:
`align-case-225-child-unavailability-not-run` consumes the exact Engine
unavailable/fallback tuple before native finalization, while
`align-case-225-closeout-summary-contract` makes the Subject's case-local
index keys explicit and anchors observer identity in the Engine index. Their
focused static contract passes, but the latest native run was `CANCELLED` by
the user after 515.509 seconds and cannot close either native claim. They are
archived as quarantined historical work, not as successful Agent-behavior
verification.

**Runtime/cost disposition:** Case 225's static contract remains a useful
low-cost regression, but its current extreme-slow shape is not a runnable
remediation asset. Do not start another Case 225 native run. Any continuation
must first propose a shorter bounded case shape with an explicit question,
cost/latency envelope, supported runnable registration, and separate proof
permission; a timeout or cancelled run is a host/lifecycle fact, never a
semantic or Agent-behavior verdict.

- [x] Record static delivery, deterministic Engine behavior, and real Agent
  flow separately for every sampled obligation, retaining unavailable classes
  as `NOT_RUN` or `UNOBSERVED`.
- [x] Classify H1-H4 as unresolved where current-head evidence lacks the
  required comparison or retained real-Agent trajectory.
- [x] Keep prompt/control-surface feedback constrained to decision-point
  projection and structured-root consumption; no additional static prose is
  justified by the retained evidence.

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
