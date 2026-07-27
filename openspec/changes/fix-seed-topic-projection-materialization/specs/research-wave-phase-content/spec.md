> req: RWP-016

## MODIFIED Requirements

### Requirement: Wave phase docs SHALL teach canonical gate-consumable refs and roles

Wave phase docs SHALL teach the same direct artifact shapes that gate/inspect
helpers consume. Agent-facing examples SHALL not encode harmless-looking
spelling, field, enum, path or role drift that causes deterministic failure,
and SHALL not reproduce large validator implementations in prose.

Wave0, Wave1 and Wave2 SHALL load `shared/shared-seed-topic-template` through
their actual `requires` chain. The template is their complete Seed Topic
Document/Projection Packet contract; phase bodies shall retain only Wave-local
authority, queue/submit sequence, concrete artifact guidance and the command
checkpoint. They SHALL not instruct Phase Agents to discover section headings,
replace tokens by hand, edit a seed directly, or build a local return-map
validator. Each canonical slot's visible `回填卡` is the compact per-heading
instruction at the exact decision point: it names the writer, direct authority,
`entry_id` plus five required entry fields, legal packet action and prohibitions.
The Phase Agent SHALL retain that card and write only through the packet/writer
path; it SHALL not reinterpret the card as an entry or locally paraphrase it
into a competing contract.

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
- **THEN** its visible `回填卡` SHALL name the slot's authority, entry shape and
  `wave_projection/apply_seed_projection` action
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
