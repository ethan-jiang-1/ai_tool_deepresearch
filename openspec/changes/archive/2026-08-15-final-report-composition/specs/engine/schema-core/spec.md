> req: SCO-002, SCO-008, SCO-011
> inv: INV-SOR-001

## ADDED Requirements

### Requirement: HITL2 composition handoff is a strict optional profile contract

The schema module SHALL export a `CompositionHandoffSchema` for
`rb_profile.yaml#/human_decision_checkpoints/hitl2/composition_handoff` and
include that property as optional in `ProfileSchema` so historical profiles,
pre-HITL2 profiles, pending interaction, and recorded non-delivery decisions
remain readable without manufacturing delivery authorization.

When present, the object SHALL be strict and SHALL contain exactly this v1
contract:

- `contract_version`: literal integer `1`;
- `for_rerun_count`: non-negative integer;
- `reader`: strict object with trim-non-empty `description` and closed
  `familiarity: general | working | expert | mixed`;
- trim-non-empty `intended_use` and `primary_focus`;
- `content_priorities`: strict object with `foreground` and `compress`, each an
  ordered array of unique trim-non-empty strings and each permitted to be empty;
- `delivery`: strict object with a canonical BCP 47 `language`, closed
  `length: concise | standard | detailed`, closed
  `evidence_exposure: key_evidence | balanced | audit_ready`, and closed
  `appendix: none | as_needed | required`; and
- optional trim-non-empty `view_instructions`.

All required fields SHALL be explicit. The schema SHALL NOT default a missing
reader, use, focus, priority array, delivery field, or custom instruction. It
SHALL reject unknown properties at every nested level, empty strings, duplicate
priority items after trimming, invalid language tags, unsupported enum values,
and exact unresolved sentinel tokens such as `unknown`, `not_started`, or an
instruction to recover the value from `rationale`.

The schema SHALL preserve priority-array order and SHALL normalize only
structural equivalents needed for deterministic consumption: surrounding string
whitespace and the canonical language tag. It SHALL NOT copy root must-answer
items, findings, confidence, limitations, source references, citation plans,
outlines, filenames, Gate targets, or raw chat into the handoff contract.

`ProfileSchema` SHALL validate a present handoff's local shape only. The HITL2
Gate remains the owner of `proceed_to_readiness` conditional presence,
`final_report_view`, `custom_slug`, `view_instructions`, and sibling
`rerun_count` invariants so a stale or incomplete object does not invalidate an
otherwise inspectable legacy/non-delivery profile before that authorization is
requested.

#### Scenario: Complete v1 handoff parses to one normalized value

- **WHEN** a profile contains every v1 field with valid closed vocabulary,
  unique priority arrays, and a valid language tag
- **THEN** `ProfileSchema` and `CompositionHandoffSchema` SHALL accept it
- **AND** their parsed handoff SHALL trim strings, canonicalize the language
  tag, and preserve the declared priority order

#### Scenario: Strict handoff rejects unresolved or malformed authority

- **WHEN** a handoff omits a required field, adds an unknown nested field, uses
  an empty or reserved sentinel value, repeats a priority after trimming, uses
  an invalid language tag, or supplies an unsupported enum
- **THEN** schema parsing SHALL fail at the smallest affected field
- **AND** it SHALL NOT default, infer, or read a replacement from another
  profile field, Markdown projection, or chat

#### Scenario: Handoff absence remains readable before delivery authorization

- **WHEN** a historical, pre-HITL2, pending-user, or recorded non-delivery
  profile has no `composition_handoff`
- **THEN** `ProfileSchema` SHALL remain readable
- **AND** that compatibility SHALL NOT authorize readiness or Final delivery

#### Scenario: Handoff cannot duplicate existing research authority

- **WHEN** a handoff attempts to add a root must-answer set, finding list,
  confidence, limitation list, source reference, citation plan, outline, file
  target, Gate target, or chat transcript
- **THEN** the strict schema SHALL reject the unknown property
- **AND** the existing research/profile/Final owners SHALL remain unchanged
