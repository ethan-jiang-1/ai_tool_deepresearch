# Research Return Map (delta)

> req: RRM-007
> delta: RRM-007

## MODIFIED Requirements

### Requirement: Return-map inspection SHALL verify per-row current-round authority references

After return-map validation, `inspectSeedTopicReturnMaps()` SHALL verify each current-round submitted row against the target wave section owned by the current inspect command. Fields, refs, entries, tokens, and dispositions outside that target section SHALL NOT satisfy the target section contract.

The target section mapping SHALL be deterministic and shared by all call sites:

| Wave | Target sections |
|---|---|
| Wave0 | `## 本轮新增证据` |
| Wave1 | `## 本轮新增机制理解`, `## 本轮新增趋势与难点`, `## 待验证问题` |
| Wave2 | `## 当前判断` and the accepted Wave2 pending-question projection surface |

The section parser SHALL use the target header and the next `## ` header as boundaries. If the required parent seed file, target section boundary, current-round authority, or finding-index parent cannot be parsed, inspect SHALL report that earliest direct root and SHALL mask dependent per-row/per-finding symptoms rather than treating an unrelated section as evidence of completeness.

For Wave0 and Wave1:

1. Read eligible rows via `readSubmittedWorkUnitDeclarations()` and filter by index `rerun_count == profile.rerun_count`. Resolve topic binding through the canonical UID/current-or-previous layout resolver and reuse the existing Engine-owned eligible-row authority path; do not create a second round filter.
2. For each eligible row, parse only the target wave section's refs fields within the section boundary using the existing `FIELD_LINE_RE` pattern.
3. Check if the row's `work_id` appears in any parsed refs field in that target section, OR if a valid no-projection disposition entry exists for that work_id. A valid disposition entry SHALL satisfy ALL of: (a) `relationship` is `defers` OR `status` is `deferred`; (b) `next_hop` contains a limitation reason keyword (`limitation`, `not materializable`, `process-only`, `not consumer-facing`, `record-only`, `internal`); (c) `refs` either references the work_id for traceability or is empty/`none`.
4. If any eligible row has neither condition satisfied, produce one blocking finding with `repair_kind: agent_action`, `write_to: seed_topics/{slug}.md`, a section-qualified `missing_fact` naming the unreferenced work_id, and the exact same inspect command as `rerun`.

For Wave2:

1. Read `finding-index.yaml` and separate findings into two groups:
   - Current-round: `created_in_rerun_count == profile.rerun_count` -> SHALL be checked, blocking if its W2F id is missing from the target section refs.
   - Legacy: no `created_in_rerun_count` field OR `created_in_rerun_count < profile.rerun_count` -> SHALL be included for projection scope, but missing W2F id SHALL produce advisory only (non-blocking, `repair_kind: agent_action`, `blocking_basis: advisory`).
2. For each current-round finding, check if its W2F id appears in parsed refs fields in the target section. Missing -> blocking finding.
3. For each legacy finding, check if its W2F id appears in parsed refs fields in the target section. Missing -> advisory finding; inspect SHALL NOT block on this finding.
4. Pure synthesis findings (no delegated work-unit row) SHALL be included in both groups.
5. Targeted-evidence findings SHALL additionally verify submitted `wave2_targeted_evidence` backing exists through the existing authority evaluator.

If no eligible rows or current-round findings exist for the topic/wave, the check SHALL pass for the per-row/per-finding authority subcheck, while independent structural checks continue to run.

The implementation SHALL preserve the existing target-wave backfill-token filter: a token for another wave SHALL NOT short-circuit the current target section, and a token for the current wave SHALL retain the accepted first-materialization skip behavior.

#### Scenario: Wave0-valid content cannot satisfy Wave1 validation

- **WHEN** a seed topic contains a complete Wave0 return-map entry with all five fields and a concrete reference
- **AND** its Wave1 target sections contain only free-form prose or a count summary
- **AND** Wave1 inspect runs without a Wave1 backfill token
- **THEN** Wave1 inspect SHALL fail with a blocking finding scoped to the Wave1 target section
- **AND** the complete Wave0 entry SHALL NOT satisfy any Wave1 required field or reference check

#### Scenario: Count summary cannot satisfy target section

- **WHEN** a Wave1 target section contains `reference/topic-*.md (8 files)` or equivalent count-summary text without a structured entry
- **AND** another section contains a valid concrete reference
- **THEN** the target Wave1 validation SHALL fail or report the count summary as a blocking target-section finding
- **AND** the other section's concrete reference SHALL NOT mask it

#### Scenario: All eligible rows referenced passes check

- **WHEN** a topic has two eligible Wave1 rows from round 2
- **AND** both work_ids appear in the Wave1 target section refs fields
- **THEN** the authority reference check SHALL pass

#### Scenario: Missing work_id produces blocking finding

- **WHEN** a topic has one eligible Wave0 row (work_id `wv0_abc`) from round 2
- **AND** `wv0_abc` does not appear in the Wave0 target section refs fields
- **AND** no no-projection disposition exists for `wv0_abc` in that section
- **THEN** inspect SHALL produce a blocking finding naming `wv0_abc`
- **AND** the finding SHALL name `seed_topics/{slug}.md` and the Wave0 section as the repair surface

#### Scenario: No-projection disposition satisfies check

- **WHEN** a topic has one eligible Wave1 row (work_id `wv1_xyz`)
- **AND** `wv1_xyz` does not appear in the Wave1 target section refs fields
- **AND** that section contains a valid disposition with `relationship: defers`, `next_hop: "limitation: not materializable; process-only output"`, and `refs: _work_units/wave1/wv1_xyz`
- **THEN** the authority reference check SHALL pass for `wv1_xyz`

#### Scenario: No eligible rows skips only the authority subcheck

- **WHEN** a topic has submitted Wave1 rows only from round 1 (index.rerun_count=1)
- **AND** profile `rerun_count` is 2
- **THEN** no current-round eligible rows exist
- **AND** the per-row authority subcheck SHALL pass without suppressing independent structural findings

#### Scenario: Wave2 pure synthesis finding checked

- **WHEN** `finding-index.yaml` has finding W2F-015 with `created_in_rerun_count: 2` affecting this topic
- **AND** no delegated work-unit row exists for W2F-015
- **AND** W2F-015 appears in the Wave2 target section refs fields
- **THEN** the Wave2 authority reference check SHALL pass

#### Scenario: Legacy findings produce advisory, not blocking

- **WHEN** `finding-index.yaml` has a legacy finding W2F-003 without `created_in_rerun_count`
- **AND** profile `rerun_count` is 2
- **AND** W2F-003 does not appear in the Wave2 target section refs fields
- **THEN** the finding SHALL produce an advisory finding with `repair_kind: agent_action` and `blocking_basis: advisory`
- **AND** inspect SHALL NOT block on this finding
- **AND** the advisory SHALL name W2F-003 and suggest projection or disposition

#### Scenario: Legacy finding with W2F ref present passes

- **WHEN** `finding-index.yaml` has a legacy finding W2F-003 without `created_in_rerun_count`
- **AND** profile `rerun_count` is 2
- **AND** W2F-003 appears in the Wave2 target section refs fields
- **THEN** no finding SHALL be produced for that legacy projection

#### Scenario: Prerequisite failure masks dependent projection symptoms

- **WHEN** the target seed section boundary or required finding-index parent cannot be parsed
- **THEN** inspect SHALL report the earliest direct prerequisite root
- **AND** it SHALL NOT emit independent per-row/per-finding missing-reference symptoms that depend on that root

#### Scenario: Other-wave token does not short-circuit target validation

- **WHEN** a seed topic contains `__BACKFILL_WAVE1_MECHANISMS__`
- **AND** Wave0 inspect runs
- **THEN** Wave0 target-section validation SHALL proceed
- **AND** the Wave1 token SHALL NOT make Wave0 pass or skip

#### Scenario: Current-wave token preserves first materialization behavior

- **WHEN** a seed topic contains the target wave's accepted backfill token
- **AND** no current-round projection is expected because first materialization is incomplete
- **THEN** target-wave return-map validation SHALL retain the accepted token skip behavior
- **AND** no second generic token family SHALL be introduced
