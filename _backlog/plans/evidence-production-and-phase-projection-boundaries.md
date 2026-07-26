---
title: Evidence ownership and canonical seed authoring
status: research_backlog_with_no_fixed_openspec_change
created: 2026-07-26
source_bugs: BUG-124, BUG-125, BUG-126, BUG-127, BUG-128, BUG-129, BUG-130, BUG-131
---

# Evidence Ownership And Canonical Seed Authoring

## Reviewer Context And Reading Route

This is a planning and review packet, not an OpenSpec proposal and not
implementation permission. It is intended to be understandable without prior
participation in the failing run:

1. Read this file for the observed contradictions, verified code facts, the
   falsification step, three candidate changes, the unowned policy decision,
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
| [BUG-126](../bugs/BUG-126-seed-topic-yaml-roundtrip-fragility.md), [BUG-127](../bugs/BUG-127-must-answer-exact-match-not-signaled.md) | The Agent hand-authors YAML whose identity fields must exactly equal `rb_plan.md#/topic_registry`; quoting/Unicode causes parse failures and a semantically equivalent `must_answer` rewrite fails only at completion. | Canonical identity must not be an Agent-maintained duplicate; mutable seed enrichment still needs an explicit legal writer. |
| [BUG-124](../bugs/BUG-124-shared-ref-agent-action-hint-misleading.md), [BUG-128](../bugs/BUG-128-wave0-shared-ref-threshold-impractical.md) | Wave0 demands cross-topic `reference/00-shared-*.md` evidence; the gate's own repair hint sent the Phase Agent to write the file directly, which then failed as a bypass, and the profile floor asked for 22 such files that no sub-agent produced. | Two separable problems: a repair hint that names an illegal action, and a floor whose formula assumes shared references are a free by-product. Whether a *new* producer contract is also needed is open — see Step 0. |
| [BUG-125](../bugs/BUG-125-queue-payload-validation-at-claim-not-enqueue.md) | Queue cards can be accepted and reported healthy at enqueue, then fail the same assignment contract at claim and block the active window; recovery required direct queue-file editing. | Queue admission must answer the claimability question before persistence, while claim rechecks current facts through the same evaluator. |
| [BUG-129](../bugs/BUG-129-wave1-ref-materialization-same-bypass.md) | Wave1 instructions permit the Phase Agent to materialize topic references from submitted sources, and the classifier already has that projection branch — yet all 80 materialized files counted 0. | The Wave1 projection rule exists; what is missing is the submitted source backing it must bind to. Confirm the failing root before treating this as a classification defect. |
| [BUG-130](../bugs/BUG-130-wave2-pure-synthesis-vs-gate-contradiction.md) | Wave2 declares a pure-synthesis path from submitted prior evidence, while gate/finding checks demand Wave2 receipts to establish that prior evidence. | Pure synthesis must verify its prior-input/process backing without forging a Wave2 receipt; only actual targeted new evidence needs a Wave2 submission. |
| [BUG-131](../bugs/BUG-131-degraded-pass-inconsistency-wave2-vs-wave0-wave1.md) | The observed Wave0/Wave1/Wave2 results appear inconsistent, but Wave0/Wave1 declare `degradation_eligible` floors and Wave2 declares none, so the split is the accepted policy working as designed. | Do not add an override. Fix the upstream classification that produced the false failures, keep the degradation policy, and record the remaining pre-HITL2 deadlock as residual risk rather than treating it as solved. |

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

These facts constrain the candidate changes: preserve the existing sources of
record and deep helpers, and converge callers. Two changes must now begin with
a falsification step rather than an assumed gap — see Decision below. Do not
solve the incident by adding a generic controller, a second ledger, a broad
queue-drop permission, a new degraded lifecycle, or a human override.

## Decision

BUG-124--131 are recurring symptoms of a small number of missing system
interfaces, not eight independent repair opportunities. But the code facts above
falsify two gaps this plan previously assumed, so the plan now opens with a
falsification step and separates the one question that has its own source of
record.

| Order | Candidate change | System interface it establishes | Bugs |
| --- | --- | --- | --- |
| 0 | `shared-reference-producer-falsification` (investigation, not a change) | Whether a legal shared-reference producer already exists, and what the floor should be | 124, 128 |
| 1 | `canonical-seed-authoring` | How a canonical Topic identity and Agent-authored enrichment become one valid seed file | 126, 127 |
| 2 | `converge-queue-demand-admission` | When a queue demand is proved claimable, and what terminates one that is not | 125 |
| 3 | `unify-evidence-ownership-and-projections` | How every Wave artifact is classified as delegated acquisition, Phase projection, or unbacked output | 124, 128, 129, 130, 131 |

Changes 1, 2 and 3 are separate because each answers a bounded question against
a *different source of record*: canonical Topic identity lives in
`rb_plan.md#/topic_registry`; demand claimability lives in the work-unit
assignment-contract registry; evidence authority lives in the submitted output
ledger. The earlier two-change split applied this criterion to seed authoring
but not to queue admission, and so folded a third source of record into
Change 3. Change 2 is also a *prerequisite* for any new demand kind, which is a
sequencing reason, not a reason to merge.

Splitting the evidence work by Wave would recreate the same ownership rule three
times, so Change 3 stays cross-Wave.

### Step 0: falsify before designing

Two Change-3 sub-goals are now blocked on evidence, because the code says the
gap may not exist:

1. **Does a shared reference already have a legal producer?** Run one
   disposable `agent_flow_e2e` in which a `wave0_source_intake` unit submits a
   `reference/00-shared-<slug>.md` as an extra `output_files` entry with role
   `reference` and a real `source_url`. Per
   `work-unit-validation.mjs:382-445`, `work-unit-constants.mjs:35` and
   `ref-count.mjs:231-239` this should submit cleanly, classify as
   `delegated_fetched_evidence`, and count toward `shared_ref_count_floor`.
   - If it passes, then `wave0_shared_foundation` and the `operate-queue`
     shared-foundation demand operation are **not** required. BUG-124 reduces to
     a wrong `repair` block in
     `gate-wave0-complete.definition.json:45` plus the `"optionally write"`
     wording in `phase-wave0.md:88-91` and
     `subagent-dpt-source-intake.md:139`. Both are data/prose fixes.
   - Only if it fails does a new acquisition kind become justified, and the
     failing root must be named before proposing one.
2. **Why did 80 backed-looking Wave1 references count as 0?**
   `classifyReferenceAuthority()` already passes a Wave1 topic reference whose
   `source_url` is bound to submitted accepted URLs and whose body cites
   submitted backing (`gate-helpers-checks.mjs:592-620`), and `ref-count`
   already counts such projections (`ref-count.mjs:238-244`). So the 0/80 result
   in BUG-129 most likely lands at `submitted_source_backing_missing`
   (`:593-603`) because the Wave1 producer contract makes `source_claims`
   optional (`work-unit-constants.mjs:56-60`) and the URLs were never submitted.
   If so, the root cause is the **Wave1 producer contract**, not classification,
   and Change 3's Wave1 work changes shape entirely.

Read the failing bundle's `rb_output_declarations.jsonl` and one rejected
reference before writing either delta spec. A proposal that assumes the gap
without this evidence will implement machinery the engine does not need.

### The unowned decision: the shared-reference floor

BUG-128's primary root cause is the threshold formula, and no candidate change
above owns it. `claim_verification` computes `6 + 2 × 8 = 22` shared references
(`schema/research-styles/claim_verification.json:4`) on top of `8 × 12` topic
sources, from a formula that assumes shared references are a free by-product of
topic-bound intake. Making the producer path legal makes 22 *reachable*; it does
not make it *reasonable*. Either the formula is adjusted with a stated
rationale, or the plan records an explicit decision to keep it and accept
routine degraded Wave0 passes. Silence here re-opens BUG-128 under a new number.

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

## Change 1: `canonical-seed-authoring`

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

## Change 2: `converge-queue-demand-admission`

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

## Change 3: `unify-evidence-ownership-and-projections`

**Goal:** make every Wave producer, projection and gate consume one ownership
model, so a legal Phase output never looks like a delegated bypass and a new
source can never masquerade as a projection.

Scope is contingent on Step 0. The bullets below are written as conditionals on
purpose; converting one into an unconditional task without its falsification
evidence is how this change becomes a mega-change.

- Keep `classifyReferenceAuthority()` as the one ownership seam. Its
  caller-visible result stays: submitted delegated acquisition, valid Phase
  projection, or a concrete unbacked root with one legal next action. Its Wave1
  and Wave2 adapters already hold materially different backing facts
  (`gate-helpers-checks.mjs:592-668`) and must keep them.
- **Wave0 shared references — conditional.** If Step 0 shows the existing
  `wave0_source_intake` path already backs and counts a shared reference, the
  work is: correct the `repair` block on `shared_ref_count_floor`
  (`gate-wave0-complete.definition.json:45`) to name the legal submit path, and
  remove `"optionally"` from the producer guidance so the shared reference is a
  declared output rather than a discretionary extra. Only if Step 0 shows a
  hard engine rejection should a `wave0_shared_foundation` kind and an
  `operate-queue` demand operation be proposed — and then as their own change,
  because a new acquisition kind is a new source of record.
- **Wave0 shared references — the classification question is still open.** A
  shared reference derived entirely from already-submitted topic-bound sources
  is a projection; one requiring a new cross-domain fetch is an acquisition.
  These are two authority classes, and nothing today verifies the ≥2-topic
  coverage that the concept rests on. Decide explicitly whether cross-topic
  coverage is a deterministic obligation. If it is not checkable, do not build a
  producer kind whose only justification is expressing it.
- **Wave1 topic references — conditional.** The projection branch and its
  counting already exist. If Step 0 confirms the failure is
  `submitted_source_backing_missing`, the fix is in the Wave1 producer contract
  (make the source URLs a projection must bind to a submitted obligation,
  `work-unit-constants.mjs:56-60`) and in reconciling `phase-wave1.md`'s
  post-submit materialization instruction with what the gate can verify. Do not
  re-route what is already routed.
- **Wave2 pure synthesis.** Route through the existing existing-backed branch.
  Synthesis, finding index, ledger and `00-cross-*` references are Phase outputs
  backed by submitted prior-wave inputs and their required process facts. Only a
  finding that records targeted new evidence requires a submitted
  `wave2_targeted_evidence` receipt; Wave1 backing is never represented as a
  forged Wave2 receipt. BUG-130's `finding_index_contract` demand that
  `subagent_receipt_refs` be Wave2-only is the concrete contradiction to resolve.
- **BUG-131 is already correct policy.** Wave0 and Wave1 declare
  `degradation_eligible: true` floors and Wave2 declares none
  (`gate-wave{0,1}-complete.definition.json:42,79,49`); the helper only degrades
  such rules (`wave-degradation-eligibility.mjs:8-14`). No override, no new
  degraded mode, no extra HITL transition. Fixing upstream classification is the
  whole remedy — but see Residual Risk.
- Make all bypass scans and formal gates consume this ownership classification
  before reporting a bypass, and confirm by test which consumers currently do
  not. Provenance, binding, finding-contract, queue, trace and lifecycle roots
  remain fail-closed.

**Legal loops:**

```text
submitted Wave0/1/2 inputs -> Phase projection -> ownership classification -> same inspect/gate
new Wave2 evidence need   -> targeted demand -> admission -> claim/submit -> same inspect/gate
```

**Done when:**

- a backed Wave1 reference and backed pure Wave2 synthesis pass without a new
  work-unit; an unbacked projection fails its exact backing root;
- a missing Wave0 shared reference has one named legal producer path and a
  repair hint that points at it, whether that path turns out to be the existing
  `wave0_source_intake` declaration or a newly justified kind;
- a genuine new Wave2 source still requires targeted submitted evidence;
- Wave0, Wave1 and Wave2 expose the same ownership/root classification before
  the existing degradation helper makes its allowed eligibility decision.

## Verification And Scope Discipline

- Unit tests cover canonical seed merge rules, queue admission parity,
  ownership classification and root selection.
- Integration tests cover each CLI/checkpoint boundary and gate/inspect parity.
- Deterministic E2E covers the Wave0 shared-reference path, the Wave1
  projection path and the Wave2 pure-synthesis/targeted-search split.
- A disposable `agent_flow_e2e` is the only proof of real Agent/sub-agent
  behavior, and is also the instrument for Step 0. Missing live evidence remains
  `NOT_RUN`.
- Each change requires a verification plan, requirement registration, an
  explicit version decision, and the project requirement/spec checks before
  archive.
- Map each bug to the specific proof that closes it. A change that lands without
  a named regression per bug cannot close that bug.

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

## Exit Criteria

BUG-124--131 close only when their legal path is implemented and regression
proved. A degraded result, manual runtime edit, console report or resumed host
turn is not closure evidence.

## Questions For Independent Review

The requested review is architectural, not a request to restate individual bug
fixes. A useful review should explicitly challenge or confirm these decisions:

1. Is the four-way split correct, now that queue admission has been separated
   out on the same source-of-record criterion that separated seed authoring? Is
   any remaining change still carrying two sources of record?
2. Step 0 asserts that a `wave0_source_intake` unit can already declare and back
   a `reference/00-shared-*.md`. If the falsification run confirms this, is
   there any *remaining* argument for `wave0_shared_foundation` beyond
   expressing cross-topic coverage — and is that coverage a deterministic
   obligation anyone checks?
3. Are shared references genuinely one authority class? A reference derived from
   submitted topic-bound sources and one requiring a new cross-domain fetch have
   different backing facts; forcing both into one producer may repeat the
   mistake this plan is trying to fix.
4. If BUG-129's 0/80 result is `submitted_source_backing_missing`, does Change 3
   retain any Wave1 work at all, or does that bug move wholly into the Wave1
   producer contract?
5. Does the seed enrichment operation preserve Agent-owned research judgment
   without permitting canonical identity drift — and should enrichment live in
   frontmatter at all, given the body already carries the same sections?
6. Who owns the shared-reference floor formula, and what is the stated rationale
   for whichever value survives?
7. Are the proposed negative proofs sufficient to show that a direct file,
   forged receipt, stale queue card, or unbacked projection cannot regain
   authority through a new success path?
