> req: RTI-007

## MODIFIED Requirements

### Requirement: Rerun direction SHALL bind to target round count with crash-safe recovery

Phase-rerun SHALL compute `target_rerun_count = profile.rerun_count + 1`. Before profile increment, the Agent SHALL place one structurally valid direction candidate for every affected add/update/direction-only Topic in the sanctioned topic-state input. The existing topic-state workspace SHALL atomically publish canonical Topic changes, touched seeds, and their target-round directions. After that commit/recovery succeeds, the existing phase-rerun profile owner SHALL increment profile `rerun_count` to target. Downstream phases SHALL activate direction only when its shared resolver state is `matching`.

The canonical writer SHALL render the exact `## 本轮重跑方向` heading and one bullet-form field per canonical label, replacing any prior direction section instead of appending another. The canonical fields SHALL be:

- `rerun_count`: non-negative target integer;
- `action`: `add` for canonical rerun `add_topic`, or `supplement` for `update_intent` and direction-only supplement;
- `new_search_dimensions`: non-empty Agent-authored guidance;
- `adjusted_depth`: non-empty Agent-authored guidance;
- `search_guardrails`: non-empty Agent-authored guidance; and
- `rationale_excerpt`: non-empty excerpt grounded in recorded HITL2 rationale.

Layout-only mutation SHALL preserve existing seed guidance and SHALL NOT create or replace direction. Unknown non-conflicting extension fields MAY be retained and SHALL NOT block readiness. Engine validation SHALL cover presence, uniqueness, enum/integer shape, target-count/action mapping, and non-empty canonical values. It SHALL NOT judge whether search dimensions, depth, guardrails or rationale wording are semantically good and SHALL NOT compare `rationale_excerpt` for semantic equivalence.

Stage 1 crash recovery SHALL inspect existing topic-state workspace first. An accepted workspace SHALL return the existing exact `recover` operation. After no workspace remains, a structurally complete future direction at `profile.rerun_count + 1` SHALL prove only that the seed-direction transaction committed before the existing profile-count step; it SHALL resume at that count owner. A malformed future direction SHALL expose its nearest seed structure root before count synchronization. An old matching/stale direction from a completed round SHALL NOT be mistaken for a new request or proof that all semantics for another rerun have been materialized.

A shared direction resolver/evaluator SHALL return one of the existing five states while also exposing normalized fields, occurrences, extensions, and structural roots:

| State | Condition | Meaning |
|---|---|---|
| `matching` | one parseable direction count equals profile | current-round direction |
| `stale` | one parseable direction count is below profile | previous-round residue |
| `future` | one parseable direction count is above profile | crash window; candidate is not current until count synchronization |
| `legacy_unbound` | no direction section, or a compatibility section without `rerun_count` | pre-v0.29/no-current-binding behavior |
| `invalid` | a present direction/field is ambiguous or unparseable | corrupt/unsupported structure |

Compatibility reading SHALL tolerate an explanatory heading suffix, optional list marker, and optional balanced asterisk-bold wrapper around field labels. It SHALL not require historical bundle migration for presentation. Duplicate direction sections, duplicate canonical fields, invalid action/round, or empty required canonical values in a matching/future candidate SHALL produce structural roots. Stale and legacy-unbound content SHALL retain existing pre-v0.29 behavior and SHALL not be upgraded into a current action by presentation normalization.

Wave phase classification and `checkRerunAddFullSynthesis` SHALL consume this one normalized result. No consumer SHALL retain a second local action/count regex. `matching` direction MAY activate `add`/`supplement`; `stale`, `future`, and `invalid` SHALL NOT activate downstream current-round action. A legacy-unbound compatibility section MAY retain existing pre-v0.29 action behavior, while absence of a direction section supplies no action.

The existing rerun-ready Gate SHALL reuse the same evaluator. It SHALL:

- evaluate matching direction structure without creating a second parser;
- for a seed with any current/future occurrence or ambiguous duplicate involving one, return only the smallest cardinality/field root before dependent symptoms;
- after a future direction is structurally complete and targets exactly `profile + 1`, remain failed with one count-synchronization root pointing to the existing phase-rerun profile-count owner;
- reject any other future count as invalid rather than increment across multiple rounds; and
- pass direction readiness only when no structural/count-sync root remains.

Direction findings SHALL include exact seed/section/field or profile coordinate, the nearest legal owner, and the same rerun-ready command. An authorized seed correction is `repair_kind: agent_action`; a complete future direction routes to the existing profile count step without asking the user. Parent profile/rationale/lifecycle failures SHALL mask dependent direction findings. The Gate SHALL NOT infer affected Topics from chat, add persistent affected-topic state, generate direction semantics, or create another CLI/Gate family.

#### Scenario: Direction written with target before profile increment

- **WHEN** current profile `rerun_count` is 1 and sanctioned topic-state input contains affected directions
- **THEN** each direction candidate SHALL use `rerun_count: 2`
- **AND** topic-state SHALL atomically commit the affected seed directions with any canonical add/update
- **AND** the existing phase-rerun profile owner SHALL then increment profile to 2

#### Scenario: Crash after direction commit before profile increment

- **WHEN** direction has complete `rerun_count: 2` and profile remains 1 after topic-state workspace commit/recovery
- **THEN** the shared resolver SHALL return `future`
- **AND** rerun-ready SHALL remain failed with one count-synchronization root
- **AND** phase-rerun SHALL execute its existing profile increment before rerunning the same Gate

#### Scenario: Crash with accepted topic-state workspace resumes exact candidate

- **WHEN** apply published an accepted topic-state workspace but did not finish all staged seed/direction bytes
- **THEN** phase-rerun SHALL run the existing exact `operate-topic-state recover` action first
- **AND** SHALL NOT reconstruct or directly append direction from chat memory

#### Scenario: New rerun request is not mistaken for crash recovery

- **WHEN** round 2 completed with profile and old direction count 2
- **AND** the user triggers round 3 rerun
- **THEN** the old matching direction SHALL NOT prove round 3 materialization
- **AND** the Agent SHALL derive a new sanctioned topic-state input from recorded round-3 rationale with target count 3

#### Scenario: Direction resolver returns stale for old action

- **WHEN** `checkRerunAddFullSynthesis` reads a seed with direction count 1 and profile count 2
- **THEN** the shared resolver SHALL return `stale`
- **AND** the evaluator SHALL NOT apply `action: add` from that direction

#### Scenario: Legacy direction without rerun_count is not blocked

- **WHEN** a pre-v0.29 seed direction section has no `rerun_count`
- **THEN** the shared resolver SHALL return `legacy_unbound`
- **AND** consumers SHALL retain existing pre-v0.29 behavior without presentation-only migration

#### Scenario: Canonical supplement direction has one complete shape

- **WHEN** sanctioned `update_intent` or `set_rerun_direction` prepares target round 4
- **THEN** the Agent-authored candidate SHALL contain one exact heading and all six canonical fields
- **AND** `action` SHALL be `supplement`

#### Scenario: Canonical add action maps from topic-state operation

- **WHEN** sanctioned topic-state applies `add_topic`
- **THEN** the new UID-bound seed direction SHALL use `action: add`
- **AND** topic-state SHALL reject a mismatched supplement candidate before workspace publication

#### Scenario: Direction-only supplement preserves canonical intent

- **WHEN** rationale changes only search/depth guidance for an existing Topic
- **THEN** `set_rerun_direction` SHALL atomically replace its seed direction with `action: supplement`
- **AND** registry intent bytes SHALL remain unchanged

#### Scenario: Layout-only mutation does not invent direction

- **WHEN** sanctioned rerun performs only rename, reorder, renumber, or safe remove through layout mutation
- **THEN** existing seed guidance SHALL be preserved for retained Topics
- **AND** no direction SHALL be written without add/update/supplement semantics

#### Scenario: Reported legacy presentation remains readable

- **WHEN** a direction uses a heading suffix, omits list markers, and wraps labels in balanced bold while retaining parseable values
- **THEN** the shared reader SHALL preserve matching/stale/future classification
- **AND** compatibility SHALL NOT require presentation-only migration

#### Scenario: Missing supplement field blocks at one root

- **WHEN** a matching supplement direction omits `adjusted_depth`
- **THEN** rerun-ready SHALL fail with one nearest root naming the seed and `adjusted_depth`
- **AND** feedback SHALL direct the Agent to repair through the sanctioned direction/topic-state owner and rerun the same Gate
- **AND** dependent Wave search/projection symptoms SHALL not be emitted at this checkpoint

#### Scenario: Duplicate direction is ambiguous

- **WHEN** one seed contains two direction occurrences or repeats a canonical field and at least one occurrence claims current/future round
- **THEN** readiness SHALL fail closed at the duplicate section/field root
- **AND** SHALL NOT select a winner by file order

#### Scenario: Unknown extension remains compatible

- **WHEN** a complete canonical direction also contains non-conflicting `target_dimension`
- **THEN** readiness SHALL not fail solely because of that extension
- **AND** downstream consumers SHALL use only normalized canonical fields

#### Scenario: Engine does not judge direction semantics

- **WHEN** all canonical direction fields are structurally valid
- **THEN** Engine SHALL not decide whether search dimensions, depth, guardrails or rationale excerpt are substantively good
- **AND** semantic quality SHALL remain owned by the Agent and recorded user rationale

#### Scenario: Incomplete future direction repairs before count synchronization

- **WHEN** profile count is 1 and a future direction targets 2 but has empty `search_guardrails`
- **THEN** rerun-ready SHALL report the seed field root before its count-synchronization root
- **AND** profile SHALL not increment until the candidate is structurally complete

#### Scenario: Future direction cannot route forward

- **WHEN** every future direction is structurally complete but profile remains below target
- **THEN** rerun-ready SHALL still fail and return the existing phase-rerun count owner
- **AND** SHALL NOT route to seed-topics until the directions become matching
