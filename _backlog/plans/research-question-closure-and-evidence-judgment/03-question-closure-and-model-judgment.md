# Change 2: Bind Wave1 Target Receipts To Wave2 Findings

> Parent plan: [User-Guided Research Controls, Question Closure, and Model-Led Evidence Judgment](../research-question-closure-and-evidence-judgment.md)
>
> Proposed OpenSpec change id: `bind-wave1-target-receipts-to-wave2-findings`
>
> Status: candidate Change 2; explore only after Change 1 has been exercised in a real bundle

## The Intended Research Loop

```text
user question / scope / profile
        |
        v
HITL1 records the agreed research intent
        |
        +--> optional user controls -> one host-file snapshot
        |
        +--> Seed Topics project topic-local search/evidence guidance
        |        |
        |        v
        |   affected Wave0 / Wave1 / Wave2 actors read the supplied controls
        |   together with their existing topic/task guidance
        |
        v
Wave1 material target (model judges adequacy under recorded intent,
with supplied controls when present)
        |
        +-- resolved here ------------------> evidence-backed explanation
        |
        +-- partial / open / cross-topic --> Wave2 finding with target origin
                                               |
                                               +-- use existing evidence
                                               +-- exploit or explore through an existing work unit
                                               +-- defer through an existing HITL2 route
                                               +-- record a bounded limitation
                                                        |
                                                        v
                                             synthesis and Final use the recorded
                                             intent, supplied controls when present,
                                             evidence, and limits
```

The user may state, in ordinary language:

- what matters most, what is out of scope, and what tradeoff they are making;
- which source classes, domains, institutions, data types, or viewpoints they prefer, distrust, or refuse to use;
- what counts as persuasive enough for their decision, and what may only serve as a lead;
- which analytical lens, comparison, risk treatment, language, structure, or report form they need.

Those are valid research-direction decisions. They are neither a new profile enum nor an Engine score.

## Why Question-Level Judgment Is The Right Unit

A source has no stable global answer to "is it good?":

- an official page can be authoritative but irrelevant to the current claim;
- a thin commercial page can be useful as a market signal but cannot establish a P0 fact;
- a strong source can be stale for a time-sensitive question;
- several individually reasonable sources can still be non-independent;
- a source acceptable for one user's exploratory map may be excluded by another user's decision boundary.

Trying to encode this as a universal `EvidenceQuality` score, then making `isCountable()` decide research sufficiency, would turn contextual judgment into a brittle second authority. It would invite fields, thresholds, exceptions, and repair paths without proving that the resulting mechanism is more reliable than the model work it evaluates.

The meaningful question is instead:

> For this material research question, under the recorded question, profile, and any user controls supplied for this run, is the available evidence direct, sufficient, independent enough, current enough, and candid enough about its limits?

The model can answer that by reading evidence, the recorded question/profile, and the user control when one exists. The system should preserve those inputs, make the disposition visible, and prevent silent loss of a declared question. It should not replace judgment with a universal score.

## Confirmed Baseline And Direct Gap

| Surface | Existing capability | Missing or important boundary |
| --- | --- | --- |
| Wave1 question list | Wave1 has targets, reconciliation, and an exploration/exploitation decision. | It remains the delegated model's readable target/reasoning input. Its submitted output contract does not make it a rewriteable current parent after an accepted submission or an intent-changing rerun. |
| Wave1 depth review | The Phase Agent writes `artifacts/wave1/{topic}/depth-review.yaml`, and the existing Wave1 evaluator/Gate already validate it as Phase-owned process evidence with a named repair coordinate. | It has no canonical Topic UID/current-intent binding, carried-forward-target projection, or Gate receipt that Wave2 can consume. Its current filename fallback accepts current/previous slugs but is not itself a UID-bound resolver; Change 2 must derive one selector from accepted `topic-layout.mjs` facts before it can reuse an identifier-only renamed review. |
| Wave2 finding index | Wave2 records decisions, confidence, backing, gap status, receipts, and synthesis eligibility. | A structurally valid index can contain unrelated or generic findings; it does not prove that a declared Wave1 target was imported, resolved, searched, deferred, or deliberately recorded. |
| Engine provenance and Gates | Ledger-based `countReferences()` / `isCountable()`, source claims, cache trails, receipts, schemas, and Gate transitions establish structural facts. | Structural countability is not a semantic verdict. The Engine can prove an identity/binding contract, but cannot determine whether a source is adequate for a question. |

The direct gap is therefore narrow: the model can name an open target such as `topic-a-T01`, while a valid Wave2 index has no contract that proves the selected target crossed the Wave1 handoff or received a later disposition.

The existing artifacts demonstrate that a `target_id` convention and `next_action`/legacy-question prose are already useful to Agents, while Wave2 `origin_refs[]` currently names artifact references rather than target identities. Neither fact is enough to assume a stable handoff contract: neither the current delegated question-list nor the Phase-owned review declares an authoritative carried-forward set, and the current Wave2 finding index has no target-binding field. Change 2 must add only the smallest declaration, receipt, and identity facts needed for that handoff; it must not reinterpret free prose or overload evidence-reference fields.

The current submitted work-unit contract retains a `result_hash` and declared output paths, and its inspection verifies that those paths still exist. It does **not** retain a content hash for each output file. Likewise, a formal Wave1 Gate currently proves the live artifacts it evaluated, but does not expose a bounded carried-forward-target receipt to Wave2. Change 2 must not describe either fact as proof that today's `question-list.md` bytes equal the bytes present at submit or Gate time. Instead, it needs one normalized receipt for the small Phase-owned declaration, not an artifact-version system.

## Scope Of Closure

The invariant applies only to a **declared carried-forward target**: a target explicitly selected for Wave2 in a Change 2 Wave1 review, normalized by a successful Wave1 Gate, and captured in that Gate's routed handoff receipt. It does not deterministically enumerate every sentence, curiosity, source lead, or unresolved phrase in a question list.

"Current" is established at the Wave1 Gate, before the handoff: Change 2 derives one review selector from the accepted canonical Topic-layout facts, resolves the review to one canonical Topic UID, recomputes its canonical-intent binding from the registry, and normalizes the selected declaration into the receipt. The current filename fallback alone is insufficient because it picks an existing path without proving UID or intent. Wave2 selects that exact receipt through its trace/load lineage; it does not reopen the mutable review or rerun a second currentness check. A target key is `canonical_topic_uid + canonical_intent_binding + declaration_local_target_id + target_revision`. The intent binding is an evaluator-defined normalized representation of the registry's title, `must_answer[]`, `scope_role`, and dependencies; it is not an Engine judgment that those facts are semantically good. The target revision derives only from the normalized target representation and carry-forward selection, so a same-`target_id` target whose material wording or disposition changes cannot reuse an old Wave2 binding.

An identifier-only layout change may reuse a UID-bound review only when the Change-2 selector locates one unambiguous review and the intent binding still matches. A title-changing layout mutation or `update_intent` changes the binding, so the Phase Agent must refresh the review during Wave1 before a new Wave1 Gate receipt can exist. The current authoring convention may contain a slug-looking `target_id`; it is local to the declaration, not a global identity. The evaluator must not fuzzy-match question prose or add an alias map. `target_id` is unique within one parent declaration. The same target may bind to several Wave2 findings, but it may not be declared twice in the one parent authority.

The model still decides whether a material target is locally resolved, carried forward, deferred through an existing route, or recorded with a bounded limitation. The Engine checks only the closed identity relation after that declaration exists:

```text
one routed Wave1 Gate receipt
  -> one or more valid Wave2 finding bindings to that receipt
  -> each binding's existing decision / gap-status route records the resulting disposition
```

This is coverage, not one-to-one ownership. A finding may cover several targets, and a target may legitimately bind to several complementary findings. A target is coverage-satisfied when at least one valid binding reaches an existing finding decision/gap-status route; several bindings are a visible set of related dispositions, not a new Engine-derived aggregate status. If their semantic interpretation needs reconciliation, the model uses the existing finding triage, limitation, or HITL2 route rather than adding a target-level score or controller. A finding that merely cites the same Wave1 artifact or topic is not a binding unless it names the receipt target identity and selected handoff receipt through the chosen contract.

## Candidate Change 2 Contract

### Goal

Give every Wave1 target that the model explicitly carries forward a durable, visible disposition in the existing Wave2 finding path.

The contract is deliberately not a detector for every question a model could have written. Wave1 remains responsible for the semantic judgment of what is material and whether to declare it for carry-forward; the Engine protects only the declared handoff from silent loss.

Change 2 is sequenced after [Change 1](02-user-research-controls.md) to keep the two contract changes independently exercisable, not because it requires a non-empty control brief. When no additional brief exists, the model still uses the recorded question, scope, and profile. It should be proposed only after focused exploration confirms the exact existing source surface and parser shape.

### Minimal Behavioral Outcome

1. The model continues to author the existing Wave1 question list and decide which targets are resolved locally versus carried forward.
2. The Phase Agent records one bounded, machine-readable carry-forward projection in the existing `artifacts/wave1/{current-topic}/depth-review.yaml`. It distinguishes explicit carry-forward from local resolution/record-only text and binds every declared target to canonical Topic identity, the current canonical-intent binding, a declaration-local `target_id`, and a target revision. `target_id` is unique within that review. An explicit empty set is valid; a malformed or missing declaration cannot silently become an empty set.
3. The successful Wave1 Gate normalizes that small projection and persists one `carried-target-receipt` in its existing Gate-attempt trace record. The receipt is the Wave1-to-Wave2 handoff fact: it contains the normalized target identities, canonical Topic/intent binding, and an Engine-produced contract version, but no arbitrary question-list snapshot or new ledger. The Gate writer must explicitly project this narrow, validated receipt into the trace event; leaving it only in `extraCheck` or a diagnostic is not a handoff. A new successful Change 2 Wave1 Gate cannot omit this receipt; an older Gate attempt that predates the receipt contract remains legacy-compatible.
4. The existing `finding-index.yaml` records the receipt target identities covered by each Wave1-derived finding through a separate binding fact, not by overloading `origin_refs[]` or `trigger_refs[]`. A finding may cover multiple targets and a target may have multiple legitimate findings; the invariant is coverage, not a forced one-to-one research model.
5. A shared evaluator selects the exact successful Wave1 Gate attempt that legally handed off into the current Wave2 entry, then verifies that every target in its receipt has a receipt-bound Wave2 binding and that each bound finding already satisfies its existing decision/receipt/handoff contract. `defer_hitl2`, `requires_internal_data`, and `record_only` remain valid only through that bound finding's existing decision/gap-status route. The evaluator does not decide whether the semantic disposition is wise or adequate, reread the completed review, or re-evaluate mutable current intent.
6. A missing target binding reports the smallest target set and the existing `finding-index.yaml` repair coordinate, then reruns the existing Wave2 inspect/Gate path. A malformed declaration is a Wave1 Gate root and must be repaired there before handoff. A missing or malformed selected receipt is a trace/lifecycle `missing_contract` boundary unless focused exploration identifies an already lawful reentry route; it is never an instruction to hand-edit a completed Wave1 artifact.

### Deliberately Narrow Data-Design Question

This review selects **one** direct parent for the carried-forward target set: the existing Phase-owned Wave1 `depth-review.yaml`. Focused exploration must prove its exact current-layout write/repair route, but it must not reopen a parallel delegated `question-list.md` authority merely for convenience.

- The Phase Agent reads the ordinary `question-list.md` reasoning, submitted evidence, current canonical Topic, and optional user controls, then makes the semantic carry-forward choice in one bounded YAML projection. The Engine parses only that projection; it does not infer targets from question-list prose.
- The projection must carry canonical `topic_uid`, an Engine-recomputable canonical-intent binding, unique declaration-local `target_id`s, a normalized target representation, and an explicit carry-forward selection. It may explicitly be empty. A reused slug-looking `target_id` alone is insufficient if its question or carry-forward decision changed.
- The existing Wave1 Gate evaluator validates the projection's direct identity/shape facts, derives a target revision from each normalized selected entry, and gives the resulting ordered set to a narrow Gate-owned receipt projector. That projector explicitly writes the validated receipt into the successful Gate attempt's trace event; it must not generically spread `extraCheck` into trace or treat a diagnostic as the receipt. The receipt is not a second review or a generic checkpoint payload: it is the existing Gate's one phase-handoff fact.
- The receipt's Engine-produced contract version is the positive compatibility discriminator. Wave2 treats a selected historical Wave1 handoff with no such version as legacy; it treats a current Change 2 Wave1 Gate attempt with a missing/malformed receipt as a failed Wave1 contract, never as legacy. No agent-authored absence marker, filename, timestamp, prose resemblance, or empty target set decides compatibility.
- Wave2 consumes the receipt attached to the exact Wave1 Gate attempt whose `check.next`/`load_complete` lineage authorized its entry. It does not scan for an arbitrary latest trace row, reparse a mutable live review, or infer a parent version from output paths, `result_hash`, an old Gate attempt, or `created_in_rerun_count`.
- An identifier-only layout change may reuse submitted evidence, one unambiguous UID-bound review selected by the Change-2 Topic-layout selector, and an unchanged target revision; Wave1 emits a new receipt from that selected single review without copying it to a second declaration path. A title-changing layout mutation or `update_intent` changes the intent binding, so an old receipt cannot authorize current Wave2 coverage; the normal lifecycle must return through a refreshed Wave1 review and Gate before Wave2 entry. A direction-only supplement may retain an unchanged target revision when its selected review and intent binding match.
- Do not create two machine-readable carry-forward sets. The human-facing target table may repeat a label for readable reasoning, but only the Phase-owned projection declares Wave2 carry-forward and only one normalizer interprets it.
- Prefer the existing Wave2 `wave1_legacy_question` finding path when it expresses the carried question's semantics. Do not create a separate finding type merely to carry target identity; existing cross-topic finding types remain available for their own different semantics.
- Define the closed disposition set. If a carried-forward target is validly deferred, requires internal data, or is recorded only, its binding must reach the existing Wave2 finding/decision/gap-status route that represents that result. There is no free-text “handled elsewhere” escape hatch.

The Wave2 side should extend the existing finding index rather than create a parallel strategy index. An illustrative field name such as `origin_target_bindings[]` is a design placeholder, not a committed schema name. It must be distinct from artifact/evidence `origin_refs[]` and trigger references so that one field has one entrance meaning.

The Wave1 Gate may use a strict parser for the bounded Phase-owned YAML projection because it owns an identity/binding fact. The rest of `question-list.md` remains ordinary model-authored reasoning: harmless heading, spacing, list, ordering, and prose differences outside that projection must not become a second blocking presentation contract. Likewise, a finding needs the target-binding field only when it is offered as coverage for a receipt-declared Wave1 target. Unrelated, emergent, or legacy findings remain valid under their existing contract but cannot satisfy closure by sharing a topic, artifact ref, or similar prose.

### Parent Authority And Revision Boundary

The handoff needs a Wave1-time current declared-target fact plus a phase handoff receipt, not a general artifact immutability system. The reviewed baseline has a hash-valid submitted `result.json`, output-path declarations, live-output existence checks, and a Wave1 Gate trace; it has no persisted content hash for each declared output and no generic snapshot of `question-list.md` bytes. A role instruction not to edit a file is guidance, not deterministic currentness.

The selected shape is therefore deliberately smaller than a live-parent assertion or artifact-version system:

```text
Phase-owned depth-review projection
  -> Wave1 evaluator normalizes direct identity facts
  -> successful Wave1 Gate trace carries one bounded handoff receipt
  -> exact Wave1-to-Wave2 handoff lineage selects that receipt
  -> Wave2 finding bindings consume receipt target revisions
```

The receipt is a canonical ordered representation or digest of the declaration's selected targets, plus its contract version and canonical Topic/intent binding. Once the handoff exists, it is the only Wave2 parent authority. Post-handoff deletion or alteration of `depth-review.yaml` must not create a second Wave2 comparison or change receipt-derived coverage; any relevant artifact/control drift belongs to existing reentry protection or a lawful rerun. The receipt is not permission to hash every work-unit output, retroactively mutate the submitted ledger, add a general artifact-version index, or make the Engine decide target semantics. Equivalent ordering/presentation must normalize to the same receipt; a changed selected target, carry-forward choice, Topic, or intent must require a new Wave1 review and receipt before a later Wave2 entry.

The present lifecycle has no legal Wave2-to-Wave1 jump. Therefore Change 2 must validate a malformed projection before Wave1 passes, and Wave2 must consume the selected receipt without reopening that completed input. If focused exploration exposes a post-handoff drift class not already owned by a legal reentry or rerun path, it is a `missing_contract` boundary, not a new unrepairable Wave2 comparison or an instruction to hand-edit a completed Wave1 artifact.

This binding does not turn the optional free-text control brief into a deterministic semantic fingerprint. Change 1's default is one run-stable snapshot. If a future accepted user-decision path changes it, that path must define how dependent work is lawfully revisited; Change 2 does not derive target receipt changes from free text. A changed brief does not license a stale finding to claim semantic adequacy, but neither does it authorize the Engine to score or hash user prose as a surrogate judge.

### Fact Lifecycle To Prove

Before proposing Change 2, focused exploration must replace this admission table with the exact existing owners and paths. A new state field is justified only if the fact in its row cannot be reconstructed from the selected direct parent authority.

| Fact | Preferred single authority | Writer / reader boundary | Currentness and compatibility |
| --- | --- | --- | --- |
| Declared carried-forward target set | One bounded projection in Phase-owned `artifacts/wave1/{topic}/depth-review.yaml`. | The Phase Agent writes it from current Topic/question/evidence facts; the Wave1 evaluator parses it before Gate pass. It is a Wave1 Gate input only. | The projection is explicitly empty or parseable/complete; absence is never an empty set. The Change-2 Topic-layout selector may choose one retained UID-bound review only for an identifier-only layout change. |
| Handoff receipt and opt-in | The successful Wave1 `gate_attempt` trace event for the exact Wave1-to-Wave2 handoff. | The Wave1 Gate normalizes and validates the declaration, then a narrow Gate writer explicitly projects the receipt into that trace entry. The Wave2 evaluator finds it through the same passed-attempt/load-complete lineage used by phase entry. | Its Engine-produced receipt contract version is the positive opt-in discriminator. A historical handoff with no version is legacy; a Change 2 Wave1 pass cannot omit, malformedly write, or leave its required receipt only in `extraCheck`/a diagnostic. |
| Parent canonical-intent validity | The Wave1 Gate-time canonical registry entry plus the review declaration's evaluator-defined intent binding, frozen in the selected receipt. | The Wave1 evaluator recomputes and validates it from the registry; Wave2 consumes the selected receipt binding rather than re-comparing mutable files or registry state. | Only identifier-only layout changes preserve eligibility. A title change or `update_intent` requires a refreshed Wave1 review and new receipt before a later Wave2 entry; free-text similarity or relabeling an old finding cannot repair it. |
| Target-to-finding coverage | A separate binding fact in existing `artifacts/wave2/finding-index.yaml`. | Wave2 Phase ownership writes it from the selected receipt; the existing Wave2 inspect/Gate evaluator family reads it. | Binding must resolve a receipt target revision, not merely an artifact path, topic slug, or similarly named historic finding. |
| Rerun/revision validity | The selected receipt's target revisions. | The Wave1 evaluator derives target revisions; Wave2 matches bindings directly to those receipt values through one shared normalizer. | An old finding remains historical evidence but cannot close a revised target. `created_in_rerun_count`, submitted paths, and `result_hash` are not substitutes for the receipt binding. |

The proposal must name the exact Wave1 Gate-attempt/phase-entry lineage used to select the receipt, the narrow trace projection that makes the receipt durable, the canonical-intent representation and legal parent route after `update_intent`, the one normalizer used to form receipt targets and validate Wave2 bindings, and the single reachable repair coordinate for each root class. It must consume the selected handoff fact rather than rerun a parallel Wave1 acceptance check, leave it as documentation convention, or let a second parser independently reconstruct the target set.

### Model-Facing Behavior

Wave1 and Wave2 guidance should ask the model to make a real contextual assessment for every material target:

- What evidence directly bears on the target rather than merely mentioning the topic?
- Does the evidence meet the applicable user source/evidence policy when supplied, as well as the target's priority and recorded profile?
- What limitation, counterexample, conflict, time boundary, or commercial incentive changes confidence?
- Is the best next move to exploit known evidence, explore a new line, use existing evidence, or record a bounded limitation?

The model records that conclusion through the existing target status, finding confidence, backing refs, gap status, decision, and readable reasoning. It need not manufacture a per-source score to do so.

### Engine Behavior

The Engine should:

- reuse the existing Wave inspect/Gate evaluator family rather than add a new command;
- parse only the bounded identity/binding facts needed for handoff coverage after selecting the exact Wave1 Gate receipt for the canonical Topic;
- short-circuit on missing/unparseable receipt or parent identity before emitting dependent findings;
- reuse existing Wave2 decision, receipt, and HITL2 checks rather than revalidate them; a target-binding check consumes their accepted result and does not create another evidence/sufficiency validator;
- return the smallest missing target set and one exact repair coordinate;
- remain tolerant of equivalent Markdown reasoning and presentation;
- decide legacy versus opted-in treatment from the selected positive receipt contract version before treating a missing declaration as compatible;
- at Wave1, reject unknown Topic/intent bindings, ambiguous review ownership, duplicate target keys, and malformed or absent declarations before a receipt can be emitted; at Wave2, reject a missing/malformed selected receipt, unknown receipt target binding, or stale selected-revision binding before treating any downstream finding as covered;
- never infer receipt identity from a submitted output path, `result_hash`, or an arbitrary old Gate attempt.

For an unreadable or malformed parent declaration, the Wave1 evaluator reports that parent as the root and masks dependent handoff facts before Wave1 can pass. For a selected opt-in receipt that is missing or malformed in trace, Wave2 reports the trace/lifecycle `missing_contract` root and does not reparse the review to improvise a replacement. For a valid selected receipt with missing coverage, the repair target is the named Wave2 finding-index binding. Post-handoff review-file drift is not a Wave2 parent fact; it follows an actual accepted reentry/rerun route when one exists and otherwise remains a `missing_contract` boundary.

### Verification Shape

- Focused deterministic cases: a selected current receipt target missing from Wave2; a parseable current review with duplicate target key, unsafe binding, unknown Topic, malformed intent binding, or missing explicit declaration; an ambiguous current/previous-slug review set that the Change-2 selector rejects rather than choosing by filename order; a successful Change 2 Wave1 Gate whose normalized receipt cannot be explicitly projected and durably appended to its `gate_attempt`, and therefore cannot hand off; a receipt left only in `extraCheck` or a diagnostic that is not accepted as a handoff; exact Wave1-to-Wave2 trace/load lineage selecting the right receipt rather than a later unrelated Gate attempt; a valid retained UID-bound review under an identifier-only renamed slug; a layout title change or sanctioned `update_intent` that requires a refreshed Wave1 review/Gate receipt before Wave2 entry; a direction-only supplement that preserves canonical intent and may retain an unchanged target revision; a same-`target_id` target whose material wording or carry-forward choice changes; equivalent declaration ordering/presentation and unrelated question-list prose that do not change a receipt; post-handoff alteration of the bounded projection that does not create a second Wave2 parent comparison or alter receipt-derived coverage; a ledger row whose declared output path still exists but is not treated as a parent-byte version proof; many-to-one and one-to-many valid coverage; a valid existing-evidence resolution; an unrelated finding with no target-binding field that stays valid but cannot close a target; a search disposition with and without submitted receipt; explicit deferral/internal-data/record-only routes; an opted-in current receipt with an explicit empty set; and a genuine historical Wave1-to-Wave2 handoff lacking the receipt version.
- One integration case proves Wave2 cannot pass when a receipt-declared handoff target has no accepted finding binding, while existing unrelated Wave2 findings remain valid only for themselves. A separate compatibility case proves a legacy bundle without a receipt does not acquire a retroactive blocker merely because it predates the contract, while a new Change 2 Wave1 pass cannot bypass the check by omitting its declaration or receipt.
- A real disposable Agent-flow run checks that the combined user-control and question-handoff guidance gives the model a usable small loop rather than requiring it to reverse-engineer source code. It includes both an explicit control brief and no-additional-controls path so question closure is not accidentally coupled to optional personalization.

The proof target is the control contract and real model behavior. It is not a mocked claim that the Engine can judge semantic quality.
