# Research Return Map (delta)

> req: RRM-001, RRM-002, RRM-003, RRM-004, RRM-005
> delta: RRM-006, RRM-007

## ADDED Requirements

### Requirement: Return-map inspection SHALL filter backfill tokens by target wave

`hasBackfillToken()` SHALL accept a `wave` parameter and match only tokens belonging to that wave:

| Wave | Tokens checked |
|---|---|
| Wave0 | `__BACKFILL_WAVE0_EVIDENCE__` |
| Wave1 | `__BACKFILL_WAVE1_MECHANISMS__`, `__BACKFILL_WAVE1_TRENDS__`, `__BACKFILL_PENDING_QUESTIONS__` |
| Wave2 | `__BACKFILL_WAVE2_JUDGMENT__` |

When `hasBackfillToken()` returns true for the target wave, return-map validation for that wave SHALL be skipped. Tokens belonging to other waves SHALL NOT cause a skip.

Call sites in `inspectSeedTopicReturnMaps()` SHALL pass the current target wave. The `__BACKFILL_PENDING_QUESTIONS__` token is assigned to Wave1 (Wave1 is its primary consumer; Wave2 appends W2F-xxx entries when no token is present).

#### Scenario: Wave0 inspect not short-circuited by Wave1 token

- **WHEN** a seed topic file has `__BACKFILL_WAVE1_MECHANISMS__` present
- **AND** Wave0 inspect runs with `wave: 'wave0'`
- **THEN** `hasBackfillToken(content, 'wave0')` SHALL return false
- **AND** Wave0 return-map validation SHALL proceed

#### Scenario: Wave2 inspect not short-circuited by Wave1 shared token

- **WHEN** a seed topic file has `__BACKFILL_PENDING_QUESTIONS__` present (Wave1's token, not yet consumed)
- **AND** Wave2 inspect runs with `wave: 'wave2'`
- **THEN** `hasBackfillToken(content, 'wave2')` SHALL return false (token belongs to Wave1)
- **AND** Wave2 return-map validation SHALL proceed

### Requirement: Return-map inspection SHALL verify per-row current-round authority references

After return-map validation, `inspectSeedTopicReturnMaps()` SHALL verify that each current-round submitted row has either its work_id referenced in the target section's parsed refs fields or an explicit no-projection disposition entry.

For Wave0 and Wave1:
1. Read eligible rows via `readSubmittedWorkUnitDeclarations()` and filter by index `rerun_count == profile.rerun_count`. Resolve topic binding through the canonical UID/current-or-previous layout resolver.
2. For each eligible row, parse the target wave section's refs fields (within the section delimited by its header and the next `## ` header) using existing `FIELD_LINE_RE` pattern.
3. Check if the row's `work_id` appears in any parsed refs field, OR if a valid no-projection disposition entry exists for that work_id. A valid disposition entry SHALL satisfy ALL of: (a) `relationship` is `defers` OR `status` is `deferred`; (b) `next_hop` contains a limitation reason keyword (`limitation`, `not materializable`, `process-only`, `not consumer-facing`, `record-only`, `internal`); (c) `refs` either references the work_id (for traceability) or is empty/`none`.
4. If any eligible row has neither condition satisfied, produce a blocking finding with `repair_kind: agent_action`, `write_to: seed_topics/{slug}.md`, and `missing_fact` naming the unreferenced work_id.

For Wave2:
1. Read `finding-index.yaml`. Separate findings into two groups:
   - Current-round: `created_in_rerun_count == profile.rerun_count` → SHALL be checked (blocking if W2F-xxx id missing from section refs)
   - Legacy: no `created_in_rerun_count` field OR `created_in_rerun_count < profile.rerun_count` → SHALL be included for projection scope, but missing W2F-xxx id SHALL produce advisory only (non-blocking, `repair_kind: agent_action`, `blocking_basis: advisory`)
2. For each current-round finding, check if its W2F-xxx id appears in the target section's parsed refs fields. Missing → blocking finding.
3. For each legacy finding, check if its W2F-xxx id appears in the target section's parsed refs fields. Missing → advisory finding (Agent should include it or record disposition, but inspect does not block).
4. Pure synthesis findings (no delegated work-unit row) SHALL be included in both groups.
5. Targeted-evidence findings SHALL additionally verify submitted `wave2_targeted_evidence` backing exists.

If no eligible rows or current-round findings exist for the topic/wave, the check SHALL pass (nothing to verify).

#### Scenario: All eligible rows referenced passes check

- **WHEN** a topic has two eligible Wave1 rows from round 2
- **AND** both work_ids appear in the section's parsed refs fields
- **THEN** the authority reference check SHALL pass

#### Scenario: Missing work_id produces blocking finding

- **WHEN** a topic has one eligible Wave0 row (work_id `wv0_abc`) from round 2
- **AND** `wv0_abc` does not appear in the section's refs fields
- **AND** no no-projection disposition entry exists for `wv0_abc`
- **THEN** inspect SHALL produce a blocking finding naming `wv0_abc`

#### Scenario: No-projection disposition satisfies check

- **WHEN** a topic has one eligible Wave1 row (work_id `wv1_xyz`)
- **AND** `wv1_xyz` does not appear in refs fields
- **AND** the section contains a valid disposition entry: `relationship: defers`, `next_hop: "limitation: not materializable; process-only output"`, `refs: _work_units/wave1/wv1_xyz`
- **THEN** the authority reference check SHALL pass

#### Scenario: No eligible rows skips check

- **WHEN** a topic has submitted Wave1 rows only from round 1 (index.rerun_count=1)
- **AND** profile `rerun_count` is 2
- **THEN** no eligible rows exist
- **AND** the check SHALL pass

#### Scenario: Wave2 pure synthesis finding checked

- **WHEN** `finding-index.yaml` has finding W2F-015 with `created_in_rerun_count: 2` affecting this topic
- **AND** no delegated work-unit row exists for W2F-015 (valid pure synthesis)
- **AND** W2F-015 appears in the section's refs fields
- **THEN** the Wave2 authority reference check SHALL pass

#### Scenario: Legacy findings produce advisory, not blocking

- **WHEN** `finding-index.yaml` has a legacy finding W2F-003 without `created_in_rerun_count`
- **AND** profile `rerun_count` is 2
- **AND** W2F-003 does not appear in the section refs
- **THEN** the finding SHALL produce an advisory finding (non-blocking, `repair_kind: agent_action`, `blocking_basis: advisory`)
- **AND** inspect SHALL NOT block on this finding
- **AND** the advisory SHALL name W2F-003 and suggest including it in projection or recording a disposition

#### Scenario: Legacy finding with W2F ref present passes

- **WHEN** `finding-index.yaml` has a legacy finding W2F-003 without `created_in_rerun_count`
- **AND** profile `rerun_count` is 2
- **AND** W2F-003 appears in the section refs
- **THEN** no finding SHALL be produced (present in projection, no action needed)
