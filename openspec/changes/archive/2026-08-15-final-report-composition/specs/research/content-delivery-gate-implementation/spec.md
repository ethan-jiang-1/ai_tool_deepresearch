> req: CDG-001, CDG-002, CDG-003, CDG-004

## ADDED Requirements

### Requirement: HITL2 delivery admission SHALL validate and witness one resolved composition handoff

The HITL2 recorded Gate SHALL evaluate the composition contract only when the
recorded `user_decision` is `proceed_to_readiness`. That branch SHALL require:

- `final_report_view` is one of the existing delivery values and is not
  `not_started`;
- `composition_handoff` exists and parses through the strict v1 schema;
- `composition_handoff.for_rerun_count` equals the effective sibling
  `hitl2.rerun_count`, including the existing default of `0` when the sibling
  field is absent;
- `final_report_view: custom` has a trim-non-empty `custom_slug` and a
  trim-non-empty `composition_handoff.view_instructions`; and
- a non-custom view does not obtain any semantics from `custom_slug`.

The Gate SHALL use one shared pure evaluator for these invariants rather than
duplicate them across the definition, CLI, Readiness, or Final guidance. It
SHALL validate structure, closed vocabulary, conditional presence, and round
binding only; it SHALL NOT judge whether the reader, use, focus, or custom
instructions are semantically good.

On a successful routed `proceed_to_readiness` attempt, the Engine-authored
`gate_attempt` SHALL carry one strict immutable
`composition_handoff_receipt` with:

- `schema_version: composition-handoff-receipt/v1`;
- the normalized `final_report_view`;
- normalized `custom_slug`, using null when the selected view is not `custom`;
- the full normalized `composition_handoff` value;
- `projection_sha256`, computed from canonical JSON for those three accepted
  projection values; and
- `profile_context_sha256`, computed from the parsed current profile after
  excluding only `final_report_view`, `custom_slug`, and
  `composition_handoff` from the HITL2 object.

Canonical hashing SHALL sort object keys recursively while preserving array
order. The receipt SHALL be written through the existing strict successful
Gate trace path; a routed proceed result SHALL fail rather than report success
when its accepted receipt is not durable.

For `request_view_revision`, `repair`, `rerun`, or `stop_blocked`, the Gate SHALL
retain the existing decision behavior and SHALL NOT require a composition
handoff or emit a composition receipt. A stale handoff that remains on one of
those branches SHALL not authorize Final and SHALL not become a blocker for
that non-delivery decision.

#### Scenario: Complete proceed decision emits a bound receipt

- **WHEN** a recorded `proceed_to_readiness` profile contains a complete v1
  handoff, a delivery view, and matching rerun counts
- **THEN** the HITL2 Gate SHALL pass and route to Readiness
- **AND** its durable `gate_attempt` SHALL carry the normalized projection,
  deterministic projection fingerprint, and non-composition profile-context
  fingerprint

#### Scenario: Incomplete or stale proceed handoff fails at HITL2

- **WHEN** `proceed_to_readiness` has no handoff, a malformed handoff,
  `final_report_view: not_started`, a rerun-count mismatch, or unresolved custom
  semantics
- **THEN** the HITL2 Gate SHALL fail before routing
- **AND** feedback SHALL identify the smallest direct profile fact to repair at
  the HITL2 owner rather than direct Final to infer a replacement

#### Scenario: Non-delivery decisions do not acquire a composition blocker

- **WHEN** the recorded decision is `request_view_revision`, `repair`, `rerun`,
  or `stop_blocked`
- **THEN** the existing Gate decision contract SHALL be evaluated without
  requiring `composition_handoff`
- **AND** no composition receipt SHALL be emitted or treated as Final
  authorization

#### Scenario: Receipt durability is part of a successful route

- **WHEN** all proceed facts pass but the Engine cannot durably append the
  receipt-bearing `gate_attempt`
- **THEN** the Gate SHALL fail its successful handoff
- **AND** it SHALL direct repair to the Engine trace durability boundary and a
  rerun of the same HITL2 Gate

### Requirement: Readiness SHALL compare the current profile with the accepted composition witness

The Readiness Gate SHALL obtain its composition witness from the exact legal
HITL2-to-Readiness handoff selected by the existing route-bound handoff
preflight. It SHALL NOT scan for an arbitrary earlier receipt, choose by
filesystem recency, or read a decision brief as authority.

For a normal current contract, Readiness SHALL require a valid
`composition_handoff_receipt` on that selected passed HITL2 `gate_attempt`. It
SHALL parse the current profile, build the same normalized projection and
profile-context values, and compare both fingerprints:

- matching projection and context SHALL satisfy the consistency check;
- mismatching profile context SHALL fail as unrelated profile drift and SHALL
  not offer composition-only restore;
- matching context with a mismatching projection SHALL fail as bounded
  composition projection drift and SHALL return exactly one nearest legal
  action: `node DEEP_RESEARCH_HARNESS/cli/operate-composition-handoff.mjs
  restore --bundle <bundle> --current-node phases/phase-readiness.md`; and
- a missing, malformed, unsupported-version, or fingerprint-inconsistent
  receipt SHALL fail closed at its witness/compatibility boundary.

The `restore` operation SHALL reuse the selected legal Readiness handoff and
shared evaluator. It SHALL run only when the current non-composition profile
context still matches the receipt, replace exactly `final_report_view`,
`custom_slug`, and `composition_handoff` with the receipt's normalized accepted
values, validate the resulting profile, write it atomically, and append an
Engine-authored audit event identifying the accepted projection fingerprint.
It SHALL leave every other profile value, trace event, status value, artifact,
receipt, and research output unchanged.

After `restore`, the one next action SHALL be rerunning the same Readiness Gate.
The operation SHALL not ask the user, infer new semantics, enter Final, rerun
HITL2, or make the receipt Final's normal data source. Final SHALL continue to
read the restored current profile only.

#### Scenario: Current profile matches the route-bound accepted receipt

- **WHEN** Readiness has a legal HITL2 handoff whose receipt and current profile
  produce equal projection and context fingerprints
- **THEN** the composition consistency check SHALL pass
- **AND** Readiness SHALL continue evaluating its existing structural rules

#### Scenario: Pure composition drift is repairable without another question

- **WHEN** only `final_report_view`, `custom_slug`, or `composition_handoff`
  differs from the selected receipt while the profile-context fingerprint still
  matches
- **THEN** Readiness SHALL fail with one composition-restore operation
- **AND** successful restore followed by the same Readiness check SHALL recover
  the exact accepted projection without user interaction

#### Scenario: Unrelated profile drift cannot be hidden by restore

- **WHEN** any non-composition profile fact changes after HITL2 Gate pass
- **THEN** Readiness SHALL report unrelated profile drift
- **AND** `restore` SHALL refuse to write any field or represent the profile as
  the Gate-accepted context

#### Scenario: Final never consumes the receipt as its normal source

- **WHEN** Readiness passes after either an exact match or a supported restore
- **THEN** Final SHALL read the accepted composition values from the current
  profile
- **AND** the receipt SHALL remain an immutable consistency witness rather than
  a fallback composition owner

### Requirement: Legacy in-flight delivery SHALL use one explicit bounded migration witness

A bundle whose selected legal HITL2-to-Readiness `gate_attempt` predates the v1
receipt contract MAY use the `migrate-legacy` operation of
`operate-composition-handoff.mjs` only when all of these facts hold:

- the selected predecessor is a passed `proceed_to_readiness` handoff into
  Readiness and lacks `composition_handoff_receipt`;
- the bundle has not legally entered Final and has no accepted v1 composition
  migration for that predecessor;
- the Agent has applied the current HITL2 composition interaction contract and
  supplies one complete user-accepted v1 projection as a bounded input file;
- the supplied handoff is bound to the current effective `rerun_count`; and
- the current handoff, status, and profile are parseable and form a legal
  pre-Final lifecycle boundary.

The migration operation SHALL validate the supplied projection with the same
schema/evaluator, atomically update only the three composition profile
coordinates, and append one strict `composition_handoff_migration` event. That
event SHALL carry the same receipt shape and SHALL bind it to the exact legacy
HITL2 predecessor by its trace-event identity. Readiness MAY accept that
route-bound migration event as the compatibility witness for that predecessor.
Its `profile_context_sha256` SHALL bind the current post-migration profile
context and SHALL detect drift after migration. Because the pre-v1 predecessor
contains no profile-context fingerprint, neither the operation nor the
migration event SHALL claim that non-composition profile values are unchanged
from the time of that historical Gate attempt.

The operation SHALL reject a current v1 HITL2 receipt, a non-proceed decision,
an unsupported/stale round, a current handoff/status conflict, a second
migration, or any bundle with legal Final entry. It SHALL not infer values from
`rationale`, decision brief, chat, `custom_slug`, profile defaults, or report
content, shall not rewrite the historical Gate attempt, and SHALL not present
absence of historical context evidence as a successful equality comparison.

This compatibility path exists only for an in-flight predecessor that could
not have emitted the new receipt. Every HITL2 Gate pass produced after this
Change SHALL use the normal receipt path and SHALL be ineligible for migration.

#### Scenario: Pre-v1 in-flight bundle receives one explicit migration

- **WHEN** an eligible pre-v1 proceed handoff is waiting at Readiness and the
  Agent supplies a complete current-round projection accepted under the HITL2
  interaction policy
- **THEN** `migrate-legacy` SHALL update only the composition coordinates and
  append one predecessor-bound migration witness
- **AND** Readiness SHALL compare the current profile with that witness before
  permitting Final

#### Scenario: Migration establishes no fictional predecessor-era context proof

- **WHEN** the selected pre-v1 Gate attempt has no profile-context fingerprint
- **THEN** migration SHALL identify historical context equality as unproven and
  establish its context fingerprint only from the committed migration result
- **AND** a later non-composition profile change SHALL fail Readiness against
  that migration baseline rather than being attributed to the legacy Gate

#### Scenario: Migration cannot become a new normal success path

- **WHEN** the selected HITL2 handoff already carries a v1 receipt, the bundle
  has legally entered Final, or a migration already exists
- **THEN** `migrate-legacy` SHALL fail without changing profile, status, trace,
  or artifacts
- **AND** it SHALL not offer another migration, a Final fallback, or a rewritten
  historical Gate event

#### Scenario: Legacy inspection does not imply delivery compatibility

- **WHEN** a historical profile remains readable but has neither a normal v1
  receipt nor an eligible migration witness
- **THEN** inspection MAY report its historical fields
- **AND** Readiness/Final authorization SHALL remain unavailable rather than
  synthesizing a composition default
