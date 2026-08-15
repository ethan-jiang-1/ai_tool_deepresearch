## Context

See `proposal.md` for motivation and scope. Today `ProfileSchema` contains
`final_report_view` but no resolved reader/use/focus contract. The HITL2 Gate
validates recorded decision facts and writes a strict successful `gate_attempt`;
Readiness already selects the legal predecessor through
`checkPhaseHandoffPreflight()`; Final already remains terminal and persists
Markdown through `persist-final-report`.

The design must add a cross-node accepted composition contract without adding a
second lifecycle, a report-quality Gate, or another production actor. It must
also distinguish historical profile readability from new delivery
authorization, and keep deterministic proof separate from unselected real
Agent interaction/report-quality evidence.

## Goals / Non-Goals

**Goals:**

- Give HITL2 and Final one strict, versioned, current-round composition
  interface whose direct owner is the current run profile.
- Make the successful HITL2-to-Readiness handoff carry an immutable witness and
  make Readiness prove Final will read the same accepted values.
- Provide one explicit mechanical repair for projection-only drift and one
  narrowly bounded legacy in-flight migration. Restore fails closed on
  receipt-era context drift; legacy migration establishes a new current
  baseline without claiming unavailable predecessor-era context evidence.
- Make the Final Phase Agent execute one repeatable, view-aware Composition Pass
  while preserving existing epistemic and submitted-backing obligations.
- Reuse existing deterministic test assets and fixture-backed delivery
  playbooks, quarantining any playbook that exceeds the active-suite budget.

**Non-Goals:**

- Add a new phase, Final Gate, Final trace event, third HITL, handoff status
  machine, report-quality deterministic score, or generic profile recovery
  subsystem.
- Delegate composition to a Sub-agent, introduce a composer work unit, or create
  a second primary deliverable.
- Copy must-answer, findings, confidence, limitations, citations, outline, or
  report file targets into `composition_handoff`.
- Rewrite already delivered historical bundles or alter accepted post-Final
  rerun/recovery behavior.
- Treat real-Agent interaction, natural-language resolution, or report semantic
  quality as a completion condition. Those claims require a later, separately
  approved fast-evidence Change.

## Decisions

### 1. Profile owns accepted composition semantics

The durable coordinate is:

```text
rb_profile.yaml#/human_decision_checkpoints/hitl2/composition_handoff
```

`final_report_view` remains its existing sibling owner. The new handoff stores
only reader/use/focus and presentation constraints that cannot be reconstructed
reliably after HITL2. It does not copy research content or Final's narrative
plan.

The Zod contract is strict at every level, exports a reusable
`CompositionHandoffSchema`, and normalizes only trimmed strings and canonical
BCP 47 language tags. Structural validation stays local: absence remains
readable outside a new proceed authorization. The Gate owns conditional
presence and sibling invariants.

Why: one object gives Final a normal reasoning stop for the bounded question
“for whom and toward what delivery task should this verified state be
composed?” It preserves all distinctions that change that answer while keeping
existing research authority outside the object.

Alternatives rejected:

- `rationale` or chat fallback creates multiple semantic owners and fails on
  resume.
- A complete outline or finding list becomes stale after rerun and duplicates
  Final/research judgment.
- A handoff `status` field duplicates outer HITL2 status, decision, rerun count,
  and Gate receipt.

### 2. HITL2 recommends a complete object, not a schema questionnaire

HITL2 forms one candidate from current explicit correction, accepted HITL1
purpose/controls, root must-answer shape, transparent view defaults, and
disclosed system defaults. The brief shows user meaning rather than field names.
Only material ambiguities become questions; one message carries at most three
currently independent frontier questions.

The accepted profile write happens only after clear acceptance, correction, or
delegation. Pending candidates remain in the decision brief as human-readable
projection and never cross the Gate. `not_started` normalizes at HITL2, and
custom requires resolved `view_instructions`.

Why: the user owns new reader/use/focus semantics, but the Agent owns ordinary
recommendation and mechanical persistence. This keeps interaction helpful
without making the human operate a YAML form.

Alternative rejected: asking every field guarantees completeness mechanically
but creates unnecessary interaction and encourages users to answer internal
vocabulary rather than the real delivery question.

### 3. One pure evaluator owns normalization, hashing, and consistency

Add one focused Engine helper (planned as
`engine/helpers/composition-handoff.mjs`) that owns:

- parsing/normalizing the three-coordinate projection:
  `final_report_view`, conditional `custom_slug`, and full handoff;
- effective sibling `rerun_count` interpretation;
- proceed conditional invariants;
- recursive canonical JSON serialization (sorted object keys, array order
  preserved);
- `projection_sha256`; and
- `profile_context_sha256`, computed from parsed profile after excluding only
  the three composition coordinates.

HITL2 Gate, Readiness, restore, migration, and focused tests consume this
helper. Gate definitions retain declarative decision/brief rules; they do not
duplicate nested schema logic. `ProfileSchema` remains shape authority, while
the helper resolves the multi-field admission/consistency conclusion.

Why: one rule source prevents Gate/Readiness/operation drift and makes negative
truth tables small. It is narrower than the work it validates.

Alternative rejected: separate definition-rule checks for each nested field
would duplicate Zod, produce cascading failures, and make receipt normalization
ambiguous.

### 4. Extend the existing successful `gate_attempt` as the receipt carrier

On a routed successful HITL2 proceed, `writeGateAttempt()` receives a validated
`compositionHandoffReceipt` option, analogous to its existing routed Wave1
receipt option. The trace event carries:

```yaml
schema_version: composition-handoff-receipt/v1
final_report_view: executive_brief
custom_slug: null
composition_handoff: { ...normalized v1 value... }
projection_sha256: <sha256>
profile_context_sha256: <sha256>
```

The option is legal only for a successful routed `hitl2-recorded` attempt into
Readiness; such an attempt requires a valid receipt and strict trace durability.
Failed/non-delivery attempts carry none.

Why: the existing event already owns Gate audit and route handoff. A separate
receipt file, trace event, or profile hash record would introduce another
selection rule and atomicity boundary.

Alternative rejected: storing only a fingerprint cannot support exact bounded
restore and makes diagnostics opaque; storing the normalized projection plus
fingerprint gives both immutable evidence and integrity.

### 5. Readiness extends the existing route-bound handoff preflight

Readiness does not scan trace independently. After
`checkPhaseHandoffPreflight()` selects the exact legal HITL2 predecessor, a
composition consistency evaluator consumes that selected event and current
profile. This check runs before ordinary Readiness definition rules so missing
or corrupt witness facts short-circuit downstream symptoms.

Results are closed:

| Receipt/current state | Result | One next boundary |
|---|---|---|
| projection + context match | pass | continue current Readiness rules |
| projection differs, context matches | `composition_projection_drift` | run `restore`, rerun Readiness |
| context differs | `profile_context_drift` | owning profile/lifecycle boundary; no restore |
| receipt absent/malformed/unsupported | witness or compatibility failure | normal v1 receipt or eligible migration only |

Why: this proves exactly that Final's current Source of Record is the object
accepted by the predecessor Gate, without creating a Final Gate or making the
receipt a second read authority.

### 6. One narrow operation owns restore and legacy in-flight migration

Add:

```text
node DEEP_RESEARCH_HARNESS/cli/operate-composition-handoff.mjs restore ...
node DEEP_RESEARCH_HARNESS/cli/operate-composition-handoff.mjs migrate-legacy ...
```

`restore` is available only at the selected Readiness handoff when current
non-composition context matches the receipt. It writes exactly the three
composition coordinates with atomic temp-file + rename semantics, validates the
entire resulting profile, and writes one audit event. It does not automatically
run Readiness; the Agent reruns the same visible checkpoint.

`migrate-legacy` accepts a path to one complete projection input only for a
pre-v1 passed proceed predecessor waiting before Final. The current HITL2 Agent
interaction must have obtained user acceptance; the operation itself cannot
prove that semantic fact, so the migration playbook/guidance keeps that Agent
obligation explicit. The Engine validates structure, round, selected predecessor,
no Final entry, no prior migration, and current lifecycle/profile parseability;
it updates the same three fields and appends a predecessor-bound migration event
carrying the receipt shape. That event's `profile_context_sha256` witnesses the
post-migration current context. Because a pre-v1 predecessor never recorded a
profile-context fingerprint, the operation does not and cannot claim that every
non-composition profile value is unchanged since the legacy Gate attempt.

Why: profile is current authority, so bounded restoration must repair it rather
than teach Final to read trace. A single operation surface is cheaper and easier
to audit than a generic profile patcher or separate migration/restore commands.

Alternatives rejected:

- Automatic Readiness repair hides mutation and makes the Gate both judge and
  writer.
- Rerunning HITL2 after pure mechanical drift repeats a settled user decision.
- Defaulting legacy bundles in Final creates a permanent second success path.

### 7. Final composition is a logical module inside the existing Phase Agent

`phase-final.md` receives one explicit five-step Composition Pass:

```text
Reground
  -> Answer Inventory
  -> coverage + materiality
  -> one primary spine + placement
  -> draft + semantic self-check + persist-final-report
```

The working Answer Inventory, narrative plan, coverage summary, placement map,
omission reasons, staging draft, and self-check remain ephemeral Agent working
views. No new schema, file, Gate, role, or Queue demand owns them.

Each standard view supplies a reader task and initial spine/selection policy.
Final chooses exact sections and evidence placement inside the handoff and
verified-state boundary. Materiality and backing override compression
preferences. `evidence_map` as a report view remains distinct from the mandatory
`## Evidence Map` admission declaration.

Why: this is a deep interface for the Final Agent, not a graph node. It makes the
semantic work unavoidable without exposing another lifecycle concept.

Alternative rejected: a Formal Composer or ad-hoc Sub-agent adds a second
production actor, handoff, failure/recovery surface, and evidence burden before
real observation shows a need.

### 8. Verification closes on deterministic contracts and active fixture playbooks

The change-root `verification-plan.yaml` selects all four canonical classes:

- `unit`: extend `tests/schema/contracts/profile.test.mjs` for strict shape and
  add/extend `tests/engine/helpers/composition-handoff.test.mjs` for the pure
  projection/receipt/drift truth table;
- `integration`: extend the existing HITL2 and Readiness CLI tests for Gate
  admission, trace receipt, restore/migration, no-write failures, and Markdown
  phase/view parity;
- `deterministic_e2e`: extend `tests/e2e/rerun-round-continuity.test.mjs` with a
  production-CLI HITL2 -> Readiness -> Final contract chain and stale-round
  rejection, reusing `tests/e2e/helpers/research-chain-fixture.mjs`; and
- `agent_flow_e2e`: retain only the bounded fixture-backed HITL2 and
  delivery-tail cases. Their native traces prove deterministic Gate/chain
  behavior, never Subject-Agent recommendation, natural-language resolution,
  or report semantic quality.

Existing `case-131` and `case-132` remain active deterministic-contract
playbooks and are extended rather than duplicated. `case-135` and `case-136`
have measured native runtime above the two-minute active-suite limit, so both
are quarantined in `exp_extrem_slow/` and contribute no active Change
completion. The selected integration and deterministic E2E assets cover their
deterministic contracts. Fixed report fixtures and static prompt assertions
never claim recommendation or report semantic quality. A future Change may
introduce a replacement real-Agent proof only with a 60-second hard cap.

Why: this is the minimum active asset set that proves the contract without
turning unpredictable Agent runtime into a completion dependency. Real Agent
behavior remains an explicit future evidence question rather than an implied
result of fixture or Markdown tests.

### 9. Semantic, control, and responsibility review

**Semantic precision.** `composition_handoff` gives Final one bounded question,
preserves distinctions that change its answer, and stops normal readers from
reconstructing intent. The receipt gives Readiness a separate bounded question:
“is current profile composition exactly the predecessor-accepted projection?”
Neither layer claims report quality.

**Simple reliable control.** The direct path is profile -> one evaluator ->
existing Gate event -> existing handoff preflight -> Final. The Change removes
fallback inference from rationale, brief, chat, slug, and `not_started`; it
avoids a second receipt store, handoff status, Final Gate, controller, retry
tree, and Sub-agent. The one added recovery operation is bounded by two hashes,
the selected handoff, atomic write, and same-check rerun.

**Helper-oriented responsibility.** User decisions stop at reader/use/focus and
material custom semantics. HITL2 Agent recommends, clarifies, writes, runs Gate,
and performs legal restore/migration mechanics. Engine validates shape,
binding, witness, path, and persistence. Final Agent owns materiality,
organization, prose, and semantic self-check. No user becomes the ordinary CLI
runner, and no Agent decision overrides Engine authority.

## Risks / Trade-offs

- **Large handoff values increase trace size** -> v1 stays bounded to one small
  projection; it excludes findings, sources, outline, and report bytes.
- **Profile context hashing can over-block unrelated but harmless edits** -> hash
  parsed normalized profile rather than raw YAML bytes, exclude only composition
  coordinates, and fail closed rather than silently restore uncertain context.
- **Legacy migration could become a permanent bypass** -> accept only a selected
  pre-v1 proceed event, one migration before Final, explicit input, and no normal
  v1 receipt; never rewrite the predecessor.
- **Legacy Gate-era context equality is unprovable** -> state that boundary
  explicitly, require a fresh user-accepted projection and current legal
  lifecycle facts, then use the migration receipt only as the baseline for
  subsequent Readiness drift detection.
- **BCP 47 canonicalization differs by runtime** -> use Node's built-in
  `Intl.getCanonicalLocales()` and cover unsupported/invalid tags with focused
  tests; add no dependency.
- **Real Agent composition evidence exceeds the budget** -> quarantine the
  observed case after retaining its honest timeout diagnostics. Do not retry it
  for current completion; a future Change must first design a sub-minute
  replacement before selecting it as proof.
- **A fixture-backed playbook exceeds the active-suite budget** -> quarantine
  each measured native run above 120 seconds under `exp_extrem_slow/`, remove
  it from active manifest and Change completion, and retain its diagnostics
  until a later Change makes the scenario fast enough to reintroduce.
- **AI semantic judgment can be fallible** -> it is not selected as current
  completion evidence; any future `ai_judge` evidence remains distinct from
  real-human proof.

## Migration Plan

1. Add schema/evaluator contracts and focused unit tests without changing
   authorization.
2. Extend HITL2 Gate receipt emission and Readiness consistency checks; add the
   bounded operation and integration tests.
3. Update profile template/shared docs and HITL2/Readiness/Final guidance.
4. Extend deterministic E2E and the active delivery playbooks; quarantine any
   measured-over-120-second playbook rather than making it a standard proof
   obligation. Preserve quarantine records as diagnostics only.
5. Run selected native verification, review semantic closure, sync main specs,
   and archive through the governed finalizer.

Rollback reverts the framework and spec change coherently. Profiles that
already contain `composition_handoff` remain ordinary YAML and historical
trace events remain append-only; rollback does not delete or rewrite either.
No second state store or persistent workspace requires cleanup.
