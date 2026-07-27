> req: RWP-016

## MODIFIED Requirements

### Requirement: Wave phase docs SHALL teach canonical gate-consumable refs and roles

Wave phase docs SHALL teach the same direct artifact shapes that gate/inspect
helpers consume. Agent-facing examples SHALL not encode harmless-looking
spelling, field, enum, path or role drift that causes deterministic failure,
and SHALL not reproduce large validator implementations in prose.

Wave0, Wave1 and Wave2 SHALL load `templates/seed-topic-template` through their
actual `requires` chain. It is their pure Seed Topic Document-shape contract;
the existing `command_playbook/operate-topic-state.md` is the sole complete
Projection Packet execution contract. Phase bodies shall retain only Wave-local
authority, queue/submit sequence, concrete artifact guidance and the command
checkpoint. They SHALL not instruct Phase Agents to discover section headings,
replace tokens by hand, edit a seed directly, or build a local return-map
validator. Each canonical slot's visible `回填卡` is the compact per-heading
instruction at the exact decision point: it names the writer, direct authority,
backfill timing, `entry_id` plus five required entry fields, materialization
pointer and prohibitions. The Phase Agent SHALL retain that card and write only
through the packet/writer path; it SHALL not reinterpret the card as an entry or
locally paraphrase it into a competing contract.

After successful submitted work or accepted finding materialization, each
Wave phase SHALL teach this closeout loop:

1. read its existing direct submitted-row or finding authority;
2. use Agent judgment to form a retained Projection Packet for each affected
   current topic, including an explicit deferred disposition where applicable;
3. invoke existing `operate-topic-state apply` in its route-bound Wave window;
4. run the corresponding side-effect-free, non-routing Wave inspect; and
5. repair the smallest named packet/authority root and rerun that same inspect
   before writing completion evidence or invoking the formal gate.

The phase SHALL not ask the user to perform ordinary packet/apply/inspect work,
hand-write a ledger/receipt/trace/reference, or turn a generic submitted line
into a success substitute. A missing legal writer or authority path SHALL be
shown as the direct owner/missing-contract boundary, not silently repaired by
prose. Formal gate invocation remains after the inspect loop and retains its
existing routing ownership.

For deterministic gate-consumed surfaces, Wave docs SHALL name canonical paths,
roles, refs, required structured fields/enums and return-map navigation facts
needed to produce the artifact. Wave1 SHALL retain its existing required
evidence-summary/question-list role guidance and Wave2 SHALL retain its
finding-index/cross-reference authority split. Evidence-bearing projection refs
continue to use concrete existing `reference/*.md` navigation first, with
artifact/cache/work-unit paths as secondary provenance only.

#### Scenario: Wave closeout uses the one legal writer

- **WHEN** a Phase Agent has successful Wave0, Wave1 or Wave2 authority ready
  for a current topic
- **THEN** its phase guidance SHALL direct packet -> `operate-topic-state apply`
  -> same Wave inspect -> formal gate
- **AND** it SHALL not direct manual token replacement or direct seed editing

#### Scenario: Heading card gives the backfiller one constrained action

- **WHEN** a Phase Agent reaches a canonical Seed Topic slot during closeout
- **THEN** its visible `回填卡` SHALL name the slot's authority, backfill timing,
  entry shape and `operate-topic-state` materialization pointer
- **AND** the Agent SHALL leave the card intact and submit entries only through
  the existing writer

#### Scenario: Wave1 atomically handles its multiple owned slots

- **WHEN** Wave1 has mechanisms, trends and pending-question projection
  material for one topic
- **THEN** phase guidance SHALL direct one Wave1 packet through the existing
  writer
- **AND** it SHALL not allow partial manual backfill before completion

#### Scenario: Inspect precedes completion evidence

- **WHEN** phase-owned artifacts and seed projection packets have been applied
- **THEN** guidance SHALL put the corresponding Wave inspect before completion
  trace/evidence and formal gate invocation
- **AND** an inspect failure SHALL return to the named owner and same inspect

#### Scenario: Missing writer is an honest boundary

- **WHEN** a Phase Agent cannot form a packet because a direct submitted/finding
  authority or legal writer window is unavailable
- **THEN** guidance/feedback SHALL identify that direct owner or
  missing-contract boundary
- **AND** it SHALL not ask the user to hand-edit a seed or fabricate a receipt

#### Scenario: Phase docs keep artifact authority separate from projection

- **WHEN** a Phase Agent reads Wave1 or Wave2 artifact/reference guidance
- **THEN** it SHALL see that submitted work/finding/index/ledger remain
  authority and Seed Topic entries are navigation
- **AND** it SHALL not treat a packet or entry as evidence coverage

#### Scenario: Wave1 docs bind required paths to roles

- **WHEN** the Phase Agent reads Wave1 delegated output guidance
- **THEN** it SHALL see that `evidence-summary.md` maps to `evidence_summary`
- **AND** `question-list.md` maps to `question_list`
- **AND** `other` is not the role for those required outputs


#### Scenario: Depth-review example uses canonical ref spelling

- **WHEN** the Phase Agent reads the Wave1 depth-review example
- **THEN** `reviewed_work_unit_refs[]` SHALL show `_work_units/wave1/<work_id>` without a trailing slash


#### Scenario: Return-map docs prioritize reference navigation

- **WHEN** the Phase Agent reads seed-topic or Wave backfill guidance
- **THEN** evidence-bearing return-map examples SHALL include concrete `reference/*.md` refs when reference files are materialized
- **AND** `artifacts/`, `_cache/`, and `_work_units/` refs SHALL be described as secondary provenance


#### Scenario: Wave2 docs preserve cross-reference authority split

- **WHEN** the Phase Agent reads Wave2 reference projection guidance
- **THEN** it SHALL see that newly fetched `00-cross` evidence needs submitted `wave2_targeted_evidence`
- **AND** existing-backed `00-cross` projections need prior accepted backing plus W2F/finding-index/cross-topic-ledger refs
- **AND** `source_layer: wave2_cross` SHALL NOT be described as sufficient evidence authority


#### Scenario: Phase docs expose deterministic repair shape

- **WHEN** a stop:no Phase Agent reads the active Wave guidance
- **THEN** required gate-consumed roles, refs, paths, fields, enums, and return-map navigation expectations SHALL be visible in phase docs or generated task instructions
- **AND** the Agent SHALL NOT need Engine helper source to know the deterministic producer shape


#### Scenario: Phase Agent runs inspect before completion evidence

- **WHEN** phase-owned Wave artifacts have been materialized
- **THEN** guidance SHALL place the corresponding inspect command before completion evidence and formal gate invocation
- **AND** it SHALL describe inspect as side-effect-free and non-routing


#### Scenario: Phase Agent repairs from one inspect root cause

- **WHEN** Wave inspect reports a required structured field or provenance binding failure
- **THEN** phase guidance SHALL direct the Agent to repair that named surface and rerun the same inspect
- **AND** it SHALL NOT require a second validator or manual authority bypass


#### Scenario: Wave2 docs expose current finding contract

- **WHEN** the Phase Agent reads Wave2 finding-index guidance
- **THEN** the complete current required field set and canonical enum values SHALL be visible through the canonical guidance surface
- **AND** contradictory field-count or enum wording SHALL NOT remain
