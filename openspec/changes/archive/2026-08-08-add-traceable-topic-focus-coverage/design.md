## Context

P1 archived the user-facing focus carrier and current rerun direction without
making either an Engine input. Wave1 already owns one Phase-authored
`depth-review.yaml`, validates it against canonical Topic and submitted
work-unit authority, and returns repair-targeted diagnostics through the
existing Wave1 Gate. Current Wave adapters also preserve a clean/degraded/
failed verdict partition without giving the Gate routing ownership.

P2 must add a precise coverage layer without turning P1's free text into a
parser input, turning `depth-review.yaml` into a ledger copy, or introducing a
new lifecycle branch. The P0 decision fixes the outcome meaning: clean only
for covered commitments; partial and blocked retain visible limitations and
can only use the existing degraded handoff; malformed or repairable coverage
remains a normal failed Wave1 check.

## Goals / Non-Goals

**Goals:**

- Let the Phase Agent declare the smallest current-round focus commitment set
  and give each commitment either submitted backing or an explicit limitation.
- Let the Engine establish the structural/binding truth of `covered`,
  `partial`, and `blocked` from direct authority, then return one existing
  repair or handoff boundary.
- Keep first-run focus at round `0` and rerun focus at the current recorded
  rerun count, so historical backing cannot satisfy a new increment.
- Reuse current Wave1 repair, degradation, trace, handoff, and Agent-flow
  evidence mechanisms.

**Non-Goals:**

- Parsing or judging HITL user wording, scoring research usefulness, measuring
  source count/quality, or defining a semantic completion verdict.
- Creating a canonical Topic field, profile field, queue kind, Gate route,
  checkpoint, automatic rerun, or reader-facing evidence map.
- Rewriting historical submitted rows, direction, or evidence into current
  focus coverage.

## Decisions

### 1. Use one optional depth-review subrecord as the declaration boundary

`depth-review.yaml` is already the Phase-owned process-evidence surface next
to the accepted Wave1 submitted-binding checks. P2 extends it with one
optional `focus_coverage` subrecord rather than a ledger, profile, or Topic
field. Its absence is the exact no-declaration state; the Engine never infers
an omitted focus from a snapshot, rationale, filename, or count.

The implementation contract will use this bounded shape:

```yaml
focus_coverage:
  topic_uid: "canonical Topic UID"
  rerun_count: 0
  outcome: covered # covered | partial | blocked
  commitments:
    - id: "focus-1"
      statement: "Agent-readable bounded current research commitment"
      state: covered # covered | limited
      submitted_work_unit_refs: ["work-unit ref"]
    - id: "focus-2"
      statement: "..."
      state: limited
      limitation: "Visible reason current work cannot establish backing"
      boundary_kind: external_action # external_action | user_decision | missing_contract
```

`topic_uid` binds the process record to canonical identity while retaining the
existing `topic_slug` compatibility surface. `rerun_count` must equal the
current profile's count: it is `0` on the first run and the recorded current
count on a rerun. Every covered ref must also resolve to a paired, hash-valid
submitted index row whose explicit `rerun_count` equals that same value; a
legacy row without the index field is never implicit round `0` authority. This
keeps earlier submitted rows available as history but not eligible as current
focus backing. The field does not create a second Topic identity.

The `focus_coverage` object has exactly `topic_uid`, `rerun_count`, `outcome`,
and `commitments`. Each commitment is intentional Agent judgment, but its
conditional shape is strict: a `covered` commitment has exactly `id`,
`statement`, `state`, and a non-empty `submitted_work_unit_refs`; a `limited`
commitment has exactly `id`, `statement`, `state`, non-empty `limitation`, and
one `boundary_kind` from `external_action`, `user_decision`, or
`missing_contract`. A limited commitment omits `submitted_work_unit_refs`
rather than representing missing backing with an empty array. The Engine
validates only unique non-empty IDs/statements; current Topic/round binding;
covered refs resolving to accepted, reviewed, current-round Wave1 rows; the
limited boundary shape; and the outcome matrix. `covered` is all covered,
`partial` mixes at least one covered and one limited item, and `blocked` has
one-or-more limited items and no covered item.

**Alternative rejected:** A profile focus object or canonical Topic `focus`
field would make natural-language semantics look Engine-owned, require
migration, and duplicate P1's narrative carrier. A separate coverage file
would add a second lifecycle-adjacent artifact and another binding lookup.

### 2. Validate direct bindings through the existing Wave1 depth evaluator

The existing evaluator already owns `depth-review.yaml` parsing, canonical
Topic resolution, reviewed submitted work-unit references, and Wave1 artifact
diagnostics. P2 extends that single evaluator to return the direct
focus-coverage result. Structural/binding roots remain under the existing
non-degradable depth-contract rule; only an otherwise valid `partial` or
`blocked` result is projected through one additional definition-owned
`focus_coverage_limit` rule. The formal Gate and read-only inspect continue
sharing those same direct facts. It does not rescan prose, reimplement ledger
parsing, or read a derived evidence projection.

For a covered commitment, the evaluator requires a current-round submitted
row that resolves to the same canonical Topic and is part of the current
depth review's accepted reviewed binding. For a limited commitment, it checks
the declared limitation shape but does not infer whether an external fact or
user decision is semantically persuasive. If a known direct evaluator result
still exposes an existing legal supplementary repair, a limited record is
contradictory and fails normally; all other semantic choice stays with the
Phase Agent/HITL2 boundary.

This is a net simplification: one optional subrecord, one existing evaluator,
and one existing checkpoint replace a potential focus ledger, text parser,
parallel evidence checker, and focus-specific repair controller.

### 3. Reuse the existing verdict partition; never create a focus route

`covered` produces no P2 failure. Invalid structure/binding or a known legal
repair produces the ordinary failed Wave1 depth-contract root and the
same-check repair path. For structurally valid `partial`/`blocked`, the Gate
projects one definition-owned `focus_coverage_limit` finding with the existing
`required_floor` blocking basis and `degradation_eligible: true`. It therefore
uses the existing eligibility predicate unchanged: the focus limit may degrade
only after its current exhaustion/fatigue condition and only when no
non-eligible root remains. P2 never returns a clean result for partial or
blocked and never selects `check.next` itself.

The existing Gate/trace/handoff consumers retain their `degraded`,
`degraded_reason`, and `degraded_rules` fields. There is no new coverage status
in status.json, no new trace event, no retry loop, and no change to transition
selection. The detailed coverage record remains readable process evidence;
the Gate only projects the existing verdict partition.

**Alternative rejected:** An immediate focus-specific pass, a new `blocked`
lifecycle state, or a direct HITL2 jump would make a limitation a routing
authority. Reusing the current partition preserves one legal continuation
mechanism and one ordinary repair loop.

### 4. Keep Agent authorship and user judgment separate from Engine verdict

The Phase Agent reads P1's accepted focus context and chooses commitments; it
uses the existing queue, claim, dry-submit, submit, depth-review, and inspect
operations for any legal work. It may record a limitation only when the
existing feedback leaves an external, user-decision, or missing-contract
boundary. It does not ask the user to operate the pipeline and does not call a
new focus command.

The user continues to decide semantic usefulness at HITL2. The Engine decides
only structural validity, authoritative submitted binding, known contradictory
repair availability, and the existing verdict partition. Human-directed prose
does not create a Gate override or an Engine mutation capability.

## Risks / Trade-offs

- A Phase Agent may choose commitments that are too broad or too narrow. The
  structure makes that choice visible and traceable, but cannot certify its
  semantic quality; HITL2 remains the review boundary.
- `partial`/`blocked` require a readable limitation and ordinary degraded
  policy. They do not guarantee a handoff when any independent Wave1 root is
  still blocking.
- P1's agent-flow attempts did not prove semantic focus handling. P2 must
  retain that honest boundary and record real P2 outcomes as PASS, FAIL,
  ERROR, or NOT_RUN rather than manufacturing coverage.
- P3 remains deferred: the process record and Gate diagnostics are not yet a
  reader-facing evidence map or a replacement for submitted provenance.
