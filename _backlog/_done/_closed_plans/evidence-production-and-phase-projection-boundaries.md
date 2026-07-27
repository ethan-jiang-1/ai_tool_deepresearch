---
title: Evidence ownership and canonical seed authoring
status: closed_cls037_moved_to_closed_plans_2026_07_27
created: 2026-07-26
closed: 2026-07-27
source_bugs: BUG-124, BUG-125, BUG-126, BUG-127, BUG-128, BUG-129, BUG-130, BUG-131
---

# Evidence Ownership And Canonical Seed Authoring

## Reviewer Context And Reading Route

This is a planning and review packet, not an OpenSpec proposal and not
implementation permission. It is intended to be understandable without prior
participation in the failing run:

1. Read this file for the observed contradictions, verified code facts, the
   falsification result, D1 policy record, dormant evidence gates,
   residual risk, and review questions.
2. Read [the architecture review](evidence-production-and-phase-projection-boundaries/architecture-review.md)
   for the proposed interfaces, current reusable seams, rejected designs, and
   proof obligations.
3. Use the linked bug records below only when a reviewer needs the full runtime
   reproduction or exact observed wording. They are evidence of the problem,
   not specifications for eight isolated fixes.

**Revision note (2026-07-26):** every premise in this packet was re-checked
against current code. Two were falsified — the canonical seed merge already
exists, and the engine already appears to permit a legal shared-reference
producer — so the plan now opens with a falsification step and marks the
affected designs as contingent. Facts carry `file:line` anchors; where prose
and an anchored fact disagree, the anchored fact wins.

**Execution update (2026-07-27):** Change 1 is complete and archived as
[`2026-07-26-canonical-seed-authoring`](../../../openspec/changes/archive/2026-07-26-canonical-seed-authoring/).
It established the single structured `enrich_seed` writer, parsed-value
canonical binding, frontmatter/body ownership boundary, in-window repair
feedback, and the v0.50 compatibility boundary without adding a second writer
or a seed migration. The intervening validation maintenance change,
[`2026-07-26-repair-retired-spec-validation`](../../../openspec/changes/archive/2026-07-26-repair-retired-spec-validation/),
is also complete and archived: it repaired the two retired-spec tombstones
without restoring their legacy runtime behavior. Change 2,
`converge-queue-demand-admission`, is complete and archived as
[`2026-07-27-converge-queue-demand-admission`](../../../openspec/changes/archive/2026-07-27-converge-queue-demand-admission/).
It introduced one current-facts delegated admission path across enqueue, check,
claim and existing stale repair, without a stored verdict or in-flight rewrite.
Step 0's focused deterministic proof now passes under current canonical-topic
admission. Change 3 is complete and archived as
[`2026-07-27-align-wave0-shared-reference-guidance`](../../../openspec/changes/archive/2026-07-27-align-wave0-shared-reference-guidance/): it corrected the Wave0 guidance and repair feedback, added the focused regression coverage, and released as v0.52. D1 is now complete: the maintainer retained the existing `claim_verification` shared-reference formula and accepted its eligible-degradation cost. The remaining Wave1/Wave2 questions stay dormant behind their own runtime evidence rather than being bundled into one unbounded evidence change.

The project is an agentic research framework. The Agent searches, reads,
writes research and synthesis; Markdown carries Agent Flow; the JavaScript
Engine owns schemas, queue/work-unit transitions, receipts, trace and formal
gate verdicts. A Phase Agent may write a reader-facing artifact, but that does
not itself establish deterministic evidence authority. Conversely, the Engine
must not demand a fabricated delegated work unit merely because an Agent wrote
a lawful projection of already submitted evidence.

### In-Scope Observations

| Bug records | Observed contradiction | System-level implication |
| --- | --- | --- |
| [BUG-126](../_fixed_bugs/BUG-126-seed-topic-yaml-roundtrip-fragility.md), [BUG-127](../_fixed_bugs/BUG-127-must-answer-exact-match-not-signaled.md) | The Agent hand-authors YAML whose identity fields must exactly equal `rb_plan.md#/topic_registry`; quoting/Unicode causes parse failures and a semantically equivalent `must_answer` rewrite fails only at completion. | Canonical identity must not be an Agent-maintained duplicate; mutable seed enrichment still needs an explicit legal writer. |
| [BUG-124](../_fixed_bugs/BUG-124-shared-ref-agent-action-hint-misleading.md), [BUG-128](../_fixed_bugs/BUG-128-wave0-shared-ref-threshold-impractical.md) | Wave0 demanded cross-topic `reference/00-shared-*.md` evidence; the gate's old repair hint sent the Phase Agent to write the file directly, which failed as a bypass, and the profile floor asked for 22 such files that no sub-agent produced. | BUG-124 is fixed by the legal submitted producer path. BUG-128 is closed as an explicit product-policy decision: retain the current formula and accept its eligible-degradation cost; no new producer or threshold change is authorized. |
| [BUG-125](../_fixed_bugs/BUG-125-queue-payload-validation-at-claim-not-enqueue.md) | Queue cards can be accepted and reported healthy at enqueue, then fail the same assignment contract at claim and block the active window; recovery required direct queue-file editing. | Queue admission must answer the claimability question before persistence, while claim rechecks current facts through the same evaluator. |
| [BUG-129](../../bugs/BUG-129-wave1-ref-materialization-same-bypass.md) | Wave1 instructions permit the Phase Agent to materialize topic references from submitted sources, and the classifier already has that projection branch — yet all 80 materialized files counted 0. | The Wave1 projection rule exists; what is missing is the submitted source backing it must bind to. Confirm the failing root before treating this as a classification defect. |
| [BUG-130](../../bugs/BUG-130-wave2-pure-synthesis-vs-gate-contradiction.md) | Wave2 declares a pure-synthesis path from submitted prior evidence, while gate/finding checks demand Wave2 receipts to establish that prior evidence. | Pure synthesis must verify its prior-input/process backing without forging a Wave2 receipt; only actual targeted new evidence needs a Wave2 submission. |
| [BUG-131](../../bugs/BUG-131-degraded-pass-inconsistency-wave2-vs-wave0-wave1.md) | The observed Wave0/Wave1/Wave2 results appear inconsistent, but Wave0/Wave1 declare `degradation_eligible` floors and Wave2 declares none, so the split is the accepted policy working as designed. | Do not add an override. Fix the upstream classification that produced the false failures, keep the degradation policy, and record the remaining pre-HITL2 deadlock as residual risk rather than treating it as solved. |

`silent-autonomous-execution` remains a separate plan for BUG-099/103/104/106:
host turn liveness and silent-autonomy questions are not a remedy for a false
queue, provenance, or gate contract.

### Current Contract And Code Facts

The plan is a convergence change, not a clean-slate architecture claim.
Every fact below was re-read against current code on 2026-07-26 and carries a
`file:line` anchor. Facts marked **[falsifies]** contradict an earlier draft of
this plan and constrain what the changes may assume.

- The accepted `research-wave-gate-implementation` spec already requires Wave1
  Phase-owned references backed by submitted evidence, and Wave2
  existing-backed pure-synthesis references; it explicitly rejects both an
  unbacked file and a fake second work unit. The observed bugs show that not
  every count, bypass, finding, and gate consumer converges on that split.
- `evaluateSeedTopicAuthoring()` compares seven canonical fields
  (`topic_uid`, `id`, `slug`, `title`, `must_answer`, `scope_role`,
  `depends_on_topic_uids`) by `JSON.stringify` equality and returns the first
  mismatching field as one `canonical_binding_mismatch` root
  (`engine/helpers/seed-topic-authoring-evaluator.mjs:6,73-83`). Its callers are
  exactly the seed gate (`cli/gates/check-gate-seed-topics-ready.mjs:131`),
  queue completion (`engine/queue-manager-lifecycle.mjs:403`) and canonical
  topic inspection (`engine/helpers/canonical-topic-state.mjs:407`).
- **[falsifies]** `renderSeed()` already implements the canonical-preserving
  merge this plan proposed to build: for an existing seed it computes
  `{ ...existingSeed.frontmatter, ...canonicalFrontmatter }` and re-serializes
  once through `stringifyYaml`
  (`engine/helpers/canonical-topic-state.mjs:227-240`). Canonical identity is
  restored from the registry and Agent enrichment keys survive. The mutable
  placeholders are `hypothesis`, `in_scope`, `out_of_scope`,
  `search_guardrails.{required_terms,forbidden_broadening}` and
  `evidence_route.{preferred_sources,noise_to_avoid}` (`:129-143`). What is
  missing is only an Agent-facing way to invoke that merge with enrichment
  values, plus an earlier `must_answer` signal (BUG-127).
- `classifyReferenceAuthority()` already recognizes delegated outputs
  (`engine/helpers/gate-helpers-checks.mjs:557`), Wave1 Phase projections
  (`:592-620`), and Wave2 existing-backed cross projections (`:622-668`), and
  returns a `root_contract` for the closest backing failure (`:237-258`).
  Callers already include reference counting (`ref-count.mjs:241,274`),
  provenance and submission-presence scans
  (`gate-helpers-provenance.mjs:338,403,538`), observability
  (`file-observability.mjs:378`), and ledger coverage
  (`gate-helpers-checks.mjs:687`).
- **[falsifies]** A `wave0_source_intake` work unit can already declare a
  `reference/00-shared-*.md` output legally today. `required_outputs` is a
  floor, not a whitelist — extra `output_files` entries pass so long as their
  role is allowed (`engine/work-unit-validation.mjs:382-445`), `reference` is an
  allowed role for that kind (`engine/work-unit-constants.mjs:35`), no rule
  scopes an extra output path to the unit's topic directory, and `ref-count`
  counts any submitted `role: 'reference'` path matching the target glob
  (`engine/helpers/ref-count.mjs:231-239`). `phase-wave0.md:88-91` already lists
  the shared reference in the sub-agent's `writes_to`.
- **[falsifies]** The `shared_ref_count_floor` value is profile-computed, not
  incidental: `claim_verification` declares `base 6 + per_topic 2`
  (`schema/research-styles/claim_verification.json:4`), which is where the
  observed 22-for-8-topics floor comes from. The gate rule reads it through
  `threshold_source: rb_profile.yaml#/research_style_params/wave0_shared_ref_total`
  (`schema/gate_definitions/gate-wave0-complete.definition.json:36-46`), and the
  same rule hard-codes the misleading BUG-124 hint
  (`"repair": { "kind": "agent_action", "write_to": "reference/" }`).
- `evaluateWaveDegradationEligibility()` is already shared by Wave0, Wave1,
  and Wave2 (`cli/gates/check-gate-wave{0,1,2}-complete.mjs:134,123,122`). Only
  a finding whose rule declares `degradation_eligible: true` on a
  definition-owned `required_floor` may degrade
  (`engine/helpers/wave-degradation-eligibility.mjs:8-14`). Wave0 declares two
  such rules and Wave1 one; **Wave2 declares none**. BUG-131's observed
  wave0/wave1-pass vs wave2-fail split is therefore the accepted policy working
  as designed, not a classification defect.
- **[refines]** The enqueue/claim admission delta is two specific things, not a
  vague partiality. `validateCurrentAssignmentCard()` returns `null` for every
  kind except `wave1_topic_deepening` and takes the topic binding from the
  card's own payload (`cli/operate-queue.mjs:495-510`, called at `:639`).
  Claim preflight resolves the contract for all kinds and validates the binding
  against `rb_plan.md`'s canonical registry
  (`engine/work-unit-lifecycle.mjs:407-433`, `:382-405`). So the delta is
  (a) kind coverage and (b) binding authority.
- **[refines]** A queue terminal path already exists —
  `operate-queue repair --remove-stale` (`cli/operate-queue.mjs:35`) — but its
  `staleReason()` predicate only removes cards whose topic/finding left the
  registry (`:420-458`), so a structurally unclaimable card is not "stale" and
  survives. The fix is to extend that predicate, not to invent a terminal op.

These facts constrained the completed changes and the remaining gates: preserve
the existing sources of record and deep helpers, and converge callers. Do not
solve the incident by adding a generic controller, a second ledger, a broad
queue-drop permission, a new degraded lifecycle, or a human override.

## Decision

BUG-124--131 are recurring symptoms of a small number of missing system
interfaces, not eight independent repair opportunities. But the code facts above
falsify two gaps this plan previously assumed, so the plan now opens with a
falsification step and separates the one question that has its own source of
record.

| Order | Queue item | Kind | Bugs | Status |
| --- | --- | --- | --- | --- |
| 0 | `shared-reference-producer-falsification` | completed investigation | 124, 128 | static contract confirmed; repaired focused deterministic proof passes; no Agent-flow proof required |
| 1 | `canonical-seed-authoring` | completed OpenSpec change | 126, 127 | archived 2026-07-26 |
| 2 | `converge-queue-demand-admission` | completed OpenSpec change | 125 | archived 2026-07-27 |
| 3 | `align-wave0-shared-reference-guidance` | completed OpenSpec change | 124 | archived 2026-07-27 (v0.52) |
| D1 | `decide-wave0-shared-reference-floor` | completed product-policy decision | 128 | retained `6 + 2 × topics`; BUG-128 closed by accepted policy |
| I1 | `falsify-wave1-projection-source-backing` | dormant runtime-evidence investigation | 129 | no current defect: backed focused proof passes |
| I2 | `falsify-wave2-existing-backed-synthesis` | dormant runtime-evidence investigation | 130 | no current contradiction established |
| P1 | `preserve-existing-wave-degradation-policy` | accepted policy and residual-risk record | 131 | no implementation change planned |

The completed OpenSpec Changes 1, 2 and 3 are separate because each answered a bounded question against
a *different source of record*: canonical Topic identity lives in
`rb_plan.md#/topic_registry`; demand claimability lives in the work-unit
assignment-contract registry; evidence authority lives in the submitted output
ledger. The earlier two-change split applied this criterion to seed authoring
but not to queue admission, and so folded a third source of record into
Change 3. Change 2 is also a *prerequisite* for any new demand kind, which is a
sequencing reason, not a reason to merge.

The former cross-Wave Change 3 is retired as a single implementation unit. It
mixed a confirmed Wave0 guidance defect, a still-unowned floor decision, and
unproven Wave1/Wave2 roots. **There is no active OpenSpec change after Change
3.** D1 retained the existing formula and created no change. I1 or I2 may create
a repair change only after their stated runtime evidence contradicts the current
accepted contract. P1 is not a change.

### Step 0: falsify before designing

**Quick investigation update (2026-07-27):** the static contract evidence and
the repaired focused deterministic proof support the falsification premise.
`validateOutputFiles()` accepts any safe declared output with an allowed role
and requires a `source_url` for a `reference`
(`engine/work-unit-validation.mjs:382-445`); `wave0_source_intake` permits
that role, and `countReferences()` consumes submitted `reference` outputs by
path before applying the shared-reference glob
(`engine/helpers/ref-count.mjs:230-255`). After the fixture helper received the
canonical seed binding required by queue-demand admission, the focused tests
passed: a submitted `00-shared-*` reference counts, a direct Phase-created
orphan does not, and a backed Wave1 Phase projection counts. The selected unit
and integration commands pass 44 tests in total. The Wave1 classifier still
names `submitted_source_backing_missing` when the reference URL is absent from
submitted source/cache backing, and otherwise accepts the Phase projection
(`engine/helpers/gate-helpers-checks.mjs:592-619`). No selected real failing
BUG bundle ledger exists; that absence prevents a new Wave1 implementation
proposal, not the completed Wave0 guidance change.

**Planning consequence:** do not propose a new `wave0_shared_foundation` kind
from the old report. `align-wave0-shared-reference-guidance` completed the
Wave0 repair-feedback and producer-guidance correction with focused regression
proof. D1 retained the profile floor and accepted its eligible-degradation cost.
Wave1 requires a selected real failing bundle before any implementation proposal,
and Wave2 retains its separate receipt-evidence prerequisite.

### Evidence conditions for later changes

The static Wave0 contract and focused deterministic proof were sufficient for
the completed guidance and repair-hint correction: `wave0_shared_foundation`
and a new queue operation are not justified. The completed change used focused
unit and integration proof; it did not need deterministic E2E or Agent-flow
E2E. A real disposable Agent run remains optional diagnostic evidence only if a
future claim must establish Agent behavior.

### Execution Handoff Cards

The remaining items are gates, not pre-authorized changes. An Agent shall
complete the named bounded action, record its result here, and stop at the
listed boundary. It SHALL NOT propose a repair merely because an old bug report
contains a failing result.

#### D1: Wave0 shared-reference floor decision (complete)

**Decision owner:** the repository maintainer/product owner, not a per-bundle
HITL1 run.

**Decision (2026-07-27):** retain `claim_verification`'s existing
`wave0_shared_ref` formula, `6 + 2 × topics`. No replacement formula was
selected, so no OpenSpec implementation change is opened.

**Recorded rationale and consequence:** changing a repository style threshold
requires a positive replacement policy, not dissatisfaction with one historical
run. The decision preserves current profile behavior and explicitly accepts that
the Wave0 shared-reference floor may reach eligible degradation even though the
existing delegated producer path is legal. It does not claim that 22 references
are cheap, automatic, or normally achieved.

**Boundary:** runtime bundles may select the named profile but may not hand-edit
or choose a new formula; `apply-research-style.mjs` remains the deterministic
writer. A future reconsideration requires a new maintainer product decision
before any `adjust-wave0-shared-reference-floor` proposal.

#### I1: Falsify a Wave1 source-backing defect

**Question:** does a current real bundle that follows the accepted backed
projection contract nevertheless fail with
`submitted_source_backing_missing`?

**Required evidence package:** select one reachable bundle created or rerun on
the current accepted framework line; record its stamped framework version,
exact gate/inspect command and output, submitted work-unit row and
`rb_output_declarations.jsonl` entry, the affected reference artifact, and its
`source_url` plus cited submitted source/cache backing. An older bundle is
version-skew diagnostic evidence only, not a repair trigger.

**Allowed outcomes and stop conditions:**

1. If the classifier reports another root, or the artifact/ledger fails the
   accepted backing preconditions, record it as data/authoring or version-skew;
   stop and do not propose a framework change.
2. Only if the package satisfies the current backed-projection contract and the
   classifier still returns `submitted_source_backing_missing`, propose one
   narrow Wave1 producer-contract repair. It must preserve the existing
   classifier and Phase-owned projection rule.

#### I2: Falsify a Wave2 pure-synthesis receipt contradiction

**Question:** does a current real bundle that satisfies the accepted pure
synthesis branch get required to supply a Wave2 targeted-evidence receipt?

**Required evidence package:** select one reachable current-line bundle and
record its framework version, exact gate/inspect output, `finding-index.yaml`,
the relevant `W2F-xxx` and `00-cross-*` artifact, concrete submitted
Wave0/Wave1 backing references, and any Wave2 receipt row. Classify the finding
first: pure synthesis is a prior-evidence projection; a newly fetched source or
`gap_status: search_submitted` is targeted evidence and legitimately needs a
submitted Wave2 receipt.

**Allowed outcomes and stop conditions:**

1. If the failure is a missing/invalid required finding field, unbacked prior
   evidence, a newly fetched source, or targeted search without its Wave2
   receipt, it is an expected direct root. Record it and stop; do not weaken the
   receipt contract or substitute a Wave1 receipt.
2. Only if the complete pure-synthesis branch is satisfied yet the gate demands
   a Wave2 receipt or reports delegated bypass solely because the Phase wrote
   the projection, propose one narrow reconciliation change. Its proposal must
   cite the accepted pure-synthesis requirement and the selected counterexample.

#### P1: Preserve degradation policy and record residual risk

Wave0/Wave1's eligible quality floors and Wave2's fail-closed authority roots
remain accepted policy. No change is authorized. The pre-HITL2 deadlock remains
an accepted residual risk with an out-of-band handling boundary; reconsidering
it requires a separately scoped product question, not automatic escalation from
D1, I1, or I2.

Detailed system model, current seams, rejected alternatives, and acceptance
reasoning are in [the architecture review](evidence-production-and-phase-projection-boundaries/architecture-review.md).

## System Model

```text
Canonical Topic identity         New evidence acquisition          Reader-facing projection
rb_plan topic_registry           delegated work-unit submit        Phase Agent materialization
        |                                  |                                  |
topic-state renderer              submitted ledger + cache          submitted-input backing
        |                                  |                                  |
seed file identity envelope       source/reference authority        reference/synthesis navigation
```

The three columns answer different questions and must remain distinct:

- A canonical identity is copied from the registry and cannot be rephrased by
  an Agent.
- New evidence claims need a submitted work-unit row because they assert a
  real acquisition event.
- A Phase projection makes no new acquisition claim. It is legal only when
  the deterministic checker can trace its stated inputs to prior submitted
  evidence; its semantic prose remains Agent judgment.

The Engine owns parsing, admission, source-of-record checks and root
classification. The Agent owns enrichment, evidence selection, reference
materialization, synthesis, and the normal legal command loop. The user is not
asked to run ordinary repair commands or to approve a failed authority fact.

## Change 1: `canonical-seed-authoring` (complete)

**Archived OpenSpec:** `2026-07-26-canonical-seed-authoring`.

**Delivered boundary:** one strict `enrich_seed` apply form writes only the
five Agent-owned enrichment fields while the Engine derives the canonical
seven-field envelope from `rb_plan.md#/topic_registry`. The same evaluator
uses parsed-value equality before publish, queue completion and the Seed Topics
Gate; legacy body prose remains readable but non-authoritative.

**Goal:** eliminate the impossible contract where an Agent must hand-author
YAML identity fields that must remain byte-for-byte equal to the canonical
Topic.

This change is smaller than first scoped. `renderSeed()` already performs the
canonical-preserving merge and single atomic YAML serialization
(`canonical-topic-state.mjs:227-240`); it simply has no Agent-facing entry point
that accepts enrichment. Do not build a second writer.

- Keep `rb_plan.md#/topic_registry` as the identity authority and
  `renderSeed()`'s existing `{ ...existing, ...canonical }` merge as the one
  writer. Confirm by test that a quoted/Unicode `must_answer` survives the
  merge; if it does, BUG-126's round-trip fragility is already fixed the moment
  the Agent stops hand-editing YAML.
- Expose one narrow structured enrichment operation on that same writer. The
  Agent supplies only the allowed non-identity fields — `hypothesis`,
  `in_scope`, `out_of_scope`, `search_guardrails`, `evidence_route`
  (`:129-143`) — as validated structured input; the Engine reuses the existing
  merge and rejects canonical keys in input. The Agent continues to write the
  Markdown research body directly.
- Note the pre-existing duplication rather than deepening it: `in_scope`,
  `out_of_scope` and `evidence_route` also appear as body prose sections
  (`:166-176`). Decide in the delta spec which surface is authoritative; do not
  make the Agent author the same judgment twice.
- BUG-127 is a *signalling* defect, not a rule defect. The evaluator already
  reports the exact mismatching field (`:73-83`); it is only reached at
  completion. Surface the same evaluator earlier in the seed loop rather than
  adding a second lint command, identity hash, or parallel schema.
- Update the seed task card and shared authoring guidance: `must_answer` is
  copied, never summarized; raw YAML editing is not the path for enrichment;
  all body research judgment and explicit gaps remain Agent-owned.

**Legal loop:** topic-state seed render -> Agent invokes enrichment writer and
writes body -> existing completion evaluator -> repair the named body or
enrichment input -> rerun the same completion checkpoint.

**Done when:** quoted/Unicode canonical fields survive first-pass seed
creation; an identity mutation returns one binding root; malformed enrichment
is rejected before seed completion; a `must_answer` rewrite is reported when it
happens rather than at completion; no normal seed authoring flow requires an
Agent to escape YAML or duplicate a registry field.

## Change 2: `converge-queue-demand-admission` (complete)

**Archived OpenSpec:** `2026-07-27-converge-queue-demand-admission`.

**Delivered boundary:** a shared current-facts evaluator now admits only
unclaimed delegated demand with an explicit registered kind, current canonical
Topic/finding facts and a resolvable closed assignment contract. Enqueue,
check, claim and `repair --remove-stale` use it; non-delegated completion and
claimed in-flight terminal ownership remain separate.

**Goal:** make the enqueue-time and claim-time answer to "is this demand
claimable?" come from one evaluator, so a card cannot be accepted and reported
healthy at enqueue and then block the active window at claim.

- Extract one `admitQueueDemand` interface from claim preflight
  (`work-unit-lifecycle.mjs:407-433`) and use it at enqueue, queue health check
  and claim. It must close the two named gaps: kind coverage (today
  `validateCurrentAssignmentCard` returns `null` for everything except
  `wave1_topic_deepening`, `operate-queue.mjs:495-496`) and binding authority
  (today enqueue trusts the card's own payload while claim validates against
  `rb_plan.md`, `work-unit-lifecycle.mjs:382-405`).
- Its output is one admission verdict with a primary direct root. Note that the
  underlying resolver currently signals by `throw`
  (`work-unit-assignment-contract.mjs:116,126-131`), so enqueue reports this
  class as an uncaught error rather than the structured
  `{ ok: false, code, reason_code }` shape it uses for topic validation
  (`operate-queue.mjs:631-636`). Converging the output shape is part of this
  change.
- Claim still re-admits against current runtime facts before allocation; it
  does not trust a stored enqueue verdict. One interface, two time boundaries.
- Extend the existing `staleReason()` predicate (`operate-queue.mjs:420-458`) to
  consult the same admission verdict, so `repair --remove-stale` terminates an
  unclaimable unclaimed card. A claimed card still follows normal work-unit
  terminal handling. Do not add a new terminal operation or a broad queue-drop
  permission.

**Done when:** no card can enter the queue and later fail the same admission at
claim; every work-unit kind is covered at both boundaries; both boundaries
resolve the topic binding against the canonical registry; a legacy unclaimable
card has one legal terminal path that is not direct queue-file editing.

## Former Change 3: `unify-evidence-ownership-and-projections` (split)

This former umbrella is not proposed as one change. Its goal remains useful,
but implementation proceeds through the ordered successors above so one Wave's
unproven source facts cannot broaden another Wave's repair.

### Change 3: `align-wave0-shared-reference-guidance` (complete)

**Archived OpenSpec:** [`2026-07-27-align-wave0-shared-reference-guidance`](../../../openspec/changes/archive/2026-07-27-align-wave0-shared-reference-guidance/) (v0.52).

**Goal:** make the existing Wave0 submitted shared-reference producer visible
and make `shared_ref_count_floor` feedback name that legal delegated path,
instead of directing the Phase Agent to create an unbacked file.

**Delivered boundary:** the definition-owned repair feedback and Wave0 producer
guidance now name the existing formal `wave0_source_intake` path; the shared
reference is non-discretionary when repairing that floor. The canonical-binding
fixture repair proves submitted counting and direct-orphan rejection, while the
Wave0 CLI proof checks the returned repair coordinate. It added no work-unit
kind, queue operation, terminal path, floor value, derived health state, or
long-form E2E.

**Result:** a focused production-path proof submits an existing
`wave0_source_intake` shared reference and the count accepts it; the missing
shared-reference hint names the existing legal delegated path; direct Phase
file creation remains unbacked; and D1 retained the profile floor as accepted
policy.

### Closed And Deferred Scope

Change 3 closed the bounded Wave0 guidance defect. The existing
`wave0_source_intake` path backs and counts a shared reference; no evidence
supports `wave0_shared_foundation` or a new `operate-queue` demand operation.
D1 is complete; there is no remaining Wave0 implementation follow-up.

`classifyReferenceAuthority()` remains the one ownership seam: its Wave1 and
Wave2 adapters deliberately use different backing facts. I1 and I2, not a
general convergence change, decide whether either adapter has a current defect.
Any future proposal must name the affected consumer and preserve fail-closed
provenance, binding, finding-contract, queue, trace and lifecycle roots.

```text
submitted prior evidence -> Phase projection -> ownership classification -> same inspect/gate
new Wave2 evidence need -> targeted demand -> admission -> claim/submit -> same inspect/gate
```

## Verification And Scope Discipline

- Each change selects the smallest proof class that establishes its accepted
  deterministic claim. Change 3 used focused unit and integration tests; it did
  not need deterministic E2E or Agent-flow E2E.
- A long E2E or Agent-flow run is not presumed. It is selected only when the
  claimed behavior needs workflow-scale or real Agent-execution evidence that a
  focused deterministic proof cannot establish.
- Each change requires a verification plan, requirement registration, an
  explicit version decision, and the project requirement/spec checks before
  archive.
- Map each bug to the specific proof or product decision that closes it. A
  passing unrelated test, manual runtime edit, or console report cannot close a
  bug.

Non-goals: a generic provenance ledger, a universal artifact schema, a
workflow controller, automatic gate repair, human override, pre-HITL approval
path, host liveness feature, or a degraded bypass for authority failures.

## Residual Risk

Two risks survive every change above and must be stated rather than discovered
again in a later run:

1. **The pre-HITL2 deadlock (BUG-131, 第三因).** When a `stop: no` phase's gate
   hard-fails, `check.next` is null and HITL2 cannot be entered, so there is no
   in-framework way for a human to say "I accept this state, continue." Correct
   classification removes the *false* instances of this. A legitimately unbacked
   Wave2 finding still produces the same dead end. This plan deliberately does
   not add an override, so the dead end remains by design — record it as an
   accepted consequence with a named out-of-band path, or open it as its own
   question. Do not let the classification fix imply it was solved.
2. **Bundle version skew.** Changing ownership classification changes gate
   verdicts for bundles created under the old contract. Each change's version
   decision must say what happens to an in-flight bundle rather than leaving it
   to be re-diagnosed as a fresh bug.

## Closure Accounting

BUG-124--127 are represented by the three archived changes and their named
regressions. BUG-128 is closed by D1's explicit retain-the-formula policy
record. BUG-129 and BUG-130 are not implementation debt
unless I1 or I2 supplies its specified current-bundle counterexample. BUG-131's
eligibility split is accepted policy; its pre-HITL2 deadlock is an acknowledged
residual risk, not a falsely closed bug or an authorized override change.

A degraded result, manual runtime edit, console report or resumed host turn is
not evidence that a different deterministic defect has closed.

## Questions For Independent Review

The completed changes and D1 should not be reopened through this backlog. The
remaining review questions are only the evidence thresholds that determine
whether another bounded change exists:

1. Is the Wave1 admission rule correct: do not propose a repair until a selected
   real failing bundle, its declaration ledger and affected projection reproduce
   one backing root despite the passing focused projection proof?
2. Is the Wave2 admission rule correct: do not infer a receipt repair until a
   current pure-synthesis counterexample follows the accepted branch yet is
   rejected for lacking a Wave2 targeted-evidence receipt?
3. Does the retained degradation policy and residual pre-HITL2 risk remain an
   accepted consequence, rather than hidden implementation scope for either
   later candidate?
