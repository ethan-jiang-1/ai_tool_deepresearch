# Relay Provenance Gate

> req: RPG-001, RPG-002, RPG-003, RPG-004, RPG-005, RPG-006

## Purpose

定义 gate 层面的 phase-aware relay provenance 检查规则，验证 evidence/search outputs 是否通过 Sub-agent relay pipeline，而不是 Phase Agent 直接搜索并手工写入 artifact。

This change makes provenance stronger than mere existence. A current-wave ledger entry proves delegated `complete()` appended a record; coverage proves the files being evaluated are declared in that Engine-written ledger; slot binding proves the declared files came from a successful current-wave relay slot. Filesystem scans may expose orphan/direct-written files for diagnostics, but they do not satisfy pass authority.

Wave0/Wave1 evidence-producing outputs require hard relay provenance. Wave2 synthesis/backfill remains Phase-Agent work; only Wave2 new search/evidence/reference outputs require Wave2 relay provenance.

## ADDED Requirements

### Requirement: Gate SHALL verify scoped output declaration ledger entries

Gate CLI SHALL support an `output_declaration_ledger_exists` check type that verifies bundle root `rb_output_declarations.jsonl` exists and contains at least one valid Engine-written output declaration record matching the rule scope.

The check SHALL read JSONL records from bundle root and support rule scoping by `wave`, `producer_rule`, `role`, `work_id_pattern`, and/or `output_path_pattern`. A matching record SHALL include delegated completion provenance fields such as `work_id`, `producer_rule`, `slot_result_ref`, `runtime_receipt_ref`, and `output_files[]`.

This check proves that delegated relay completion happened in the scoped phase. It SHALL NOT by itself prove that every expected artifact/reference is covered, and it SHALL NOT replace accepted `count_floor`, `reference_ledger_coverage`, `content_dedup`, or `cache_coverage` semantics.

#### Scenario: Wave0 scoped ledger entry exists

- **WHEN** `rb_output_declarations.jsonl` contains a valid record whose lineage identifies Wave0 relay completion
- **AND** the gate rule defines `check: "output_declaration_ledger_exists"` and `wave: "wave0"`
- **THEN** the check SHALL pass
- **AND** downstream `output_declaration_coverage` and `subagent_slot_presence` checks SHALL still run when configured

#### Scenario: Ledger entries for another wave do not satisfy current wave

- **WHEN** `rb_output_declarations.jsonl` contains only Wave0 scoped records
- **AND** Wave1 gate rule requires `wave: "wave1"`
- **THEN** `output_declaration_ledger_exists` SHALL fail for Wave1
- **AND** inspect SHALL state the scoped count and missing wave

### Requirement: Gate SHALL verify scoped output declaration coverage for current phase outputs

Gate CLI SHALL support an `output_declaration_coverage` check type as the coverage extension of scoped output declaration ledger verification. It verifies phase-scoped artifact/reference outputs being evaluated by the gate are declared in Engine-written `rb_output_declarations.jsonl` records matching the rule scope.

The check SHALL compare expected or discovered current-phase output paths against scoped ledger `output_files[].path` declarations. Rule configuration SHALL identify both:

- a ledger scope selector, such as `wave`, `producer_rule`, `role`, `work_id_pattern`, or `output_path_pattern`
- an output set selector, using deterministic selectors such as:
  - `expected_from_topic_registry` for per-topic Wave0/Wave1 outputs
  - `glob` for optional promoted references such as `reference/00-cross-*.md`
  - `roles` for `source_yaml`, `evidence_summary`, `question_list`, or `reference`
  - `producer_rule` / `wave` / `work_id_pattern` for current-wave scoping

If the selector is missing, ambiguous, or unsupported, the gate SHALL fail the rule configuration with inspect output rather than silently falling back to filesystem authority.

Coverage SHALL pass only when required current-phase outputs are declared by matching ledger records. Files found on disk but absent from matching ledger records SHALL be reported as orphan/direct-written outputs and SHALL NOT satisfy this check.

#### Scenario: Wave1 evidence artifacts are ledger-covered

- **WHEN** `artifacts/wave1/topic-a/evidence-summary.md` and `artifacts/wave1/topic-a/question-list.md` exist
- **AND** matching Wave1 ledger records declare both paths in `output_files[]`
- **AND** the rule scope is `wave: "wave1"`
- **THEN** `output_declaration_coverage` SHALL pass for those paths

#### Scenario: Filesystem-only Wave1 artifact fails coverage

- **WHEN** `artifacts/wave1/topic-a/evidence-summary.md` exists on disk
- **AND** no Wave1 ledger record declares that path
- **THEN** `output_declaration_coverage` SHALL fail
- **AND** inspect SHALL list the path as an orphan/direct-written output

#### Scenario: Coverage does not replace countability

- **WHEN** a reference path is covered by a ledger record
- **THEN** accepted reference countability, format, URL quality, dedup, and cache coverage checks SHALL still apply according to their own specs

#### Scenario: Ledger file does not exist

- **WHEN** `rb_output_declarations.jsonl` does not exist at the bundle root
- **AND** an `output_declaration_coverage` rule is configured
- **THEN** the check SHALL fail
- **AND** inspect SHALL report all expected output paths as orphan/direct-written
- **AND** inspect SHALL state that the output declaration ledger is missing entirely

### Requirement: Gate SHALL verify successful current-wave subagent slot binding

Gate CLI SHALL support a `subagent_slot_presence` check type that verifies current-wave ledger-covered outputs bind back to successful terminal relay slot evidence for the same wave.

The check SHALL scan only the configured wave directory:

- `wave0` -> `_subagents/wave_00/slot_MM/`
- `wave1` -> `_subagents/wave_01/slot_MM/`
- `wave2` -> `_subagents/wave_02/slot_MM/`

A slot SHALL count only when it has a successful terminal marker. With the accepted slot lifecycle, `_status.json.status` SHALL be exactly `done`; `failed` is terminal but not successful. `result.json` SHALL exist, parse, have `status: "done"`, and SHALL match the ledger record's `slot_result_ref` where that field is available. A failed, pending, running, empty, schema-invalid, or other-wave slot SHALL NOT count.

When the gate also evaluates `output_declaration_coverage`, `subagent_slot_presence` SHALL bind slot evidence to covered ledger records where possible by `slot_result_ref`, `work_id`, `producer_rule`, and/or current wave. A generic non-empty `_subagents/<wave>/` directory is insufficient.

#### Scenario: Wave1 slot binding passes with successful Wave1 result

- **WHEN** a Wave1 ledger record declares `slot_result_ref: "_subagents/wave_01/slot_00/result.json"`
- **AND** that result file exists, parses, and represents a successful completed slot
- **THEN** `subagent_slot_presence` SHALL pass for that record

#### Scenario: Wave1 does not pass from Wave0 slots

- **WHEN** `_subagents/wave_00/slot_00/result.json` exists
- **AND** `_subagents/wave_01/` is missing or has no successful terminal slot bound to Wave1 records
- **THEN** `subagent_slot_presence` SHALL fail for a Wave1 rule

#### Scenario: Failed or pending slot does not satisfy provenance

- **WHEN** `_subagents/wave_01/slot_00/_status.json` exists with a failed or pending state
- **THEN** `subagent_slot_presence` SHALL fail
- **AND** inspect SHALL explain that the slot is present but not a successful terminal relay result

### Requirement: Wave2 relay provenance SHALL be conditional on search evidence

Wave2 gate SHALL NOT require unconditional `output_declaration_ledger_exists`, `output_declaration_coverage`, or `subagent_slot_presence` solely because the phase produced `artifacts/wave2/synthesis.md`, `artifacts/wave2/cross-topic-ledger.md`, `artifacts/wave2/finding-index.yaml`, or seed-topic backfill edits.

Note: `finding-index.yaml` appears in both roles. As a file product, it does not by itself require Wave2 relay provenance. As a signal source, its entries (see below) declare search intent and trigger conditional provenance for the corresponding search/evidence outputs. The file existing without search-signaling entries does not trigger provenance; the file existing with `decision: exploit_search` entries triggers provenance for those entries' outputs, not for the finding-index file itself.

Wave2 SHALL require blocking relay provenance for Wave2 new search/evidence/reference outputs or search claims. **Any one** of the following conditions SHALL trigger Wave2 provenance requirements for the corresponding outputs (logical OR):

- `reference/00-cross-*.md` exists (glob-based detection)
- `artifacts/wave2/finding-index.yaml` entries with `decision: exploit_search` or `decision: explore_search` (signal-based detection)
- finding-index entries with `search_required: true`
- finding-index entries with non-empty or expected `subagent_receipt_refs`
- supplementary backing/cross-topic/emergent gap-fill outputs

When multiple conditions match, provenance is required for each matched output independently. The absence of one condition does not excuse another — e.g., a `reference/00-cross-*.md` file without a matching finding-index entry still requires provenance via the glob path.

For those outputs, Wave2 rules SHALL use current-wave output declaration coverage and successful slot binding. Missing Wave2 provenance SHALL fail the conditional provenance rule and MAY also write `relay_bypass_suspected` as a diagnostic side effect.

#### Scenario: Wave2 pure synthesis does not require Wave2 subagent slots

- **WHEN** Wave2 produced `synthesis.md`, `cross-topic-ledger.md`, and `finding-index.yaml`
- **AND** no `reference/00-cross-*.md` files exist
- **AND** no finding has `decision: exploit_search` / `decision: explore_search`, `search_required: true`, or expected/non-empty `subagent_receipt_refs`
- **THEN** Wave2 gate SHALL NOT fail solely because `_subagents/wave_02/` is missing

#### Scenario: Wave2 promoted cross reference requires relay provenance

- **WHEN** `reference/00-cross-market-shift.md` exists
- **AND** no Wave2 scoped output declaration coverage and successful slot binding exists for that reference
- **THEN** Wave2 gate SHALL fail the conditional provenance rule
- **AND** the gate MAY write `relay_bypass_suspected` identifying the orphan promoted reference

#### Scenario: Wave2 mixed safe and search outputs — provenance applies per-output

- **WHEN** Wave2 produced `synthesis.md`, `cross-topic-ledger.md`, and `finding-index.yaml` (safe set)
- **AND** Wave2 also produced `reference/00-cross-market-shift.md` without Wave2 output declaration coverage and successful slot binding
- **THEN** the safe set SHALL NOT cause the gate to fail
- **AND** the conditional provenance rule targeting `reference/00-cross-*.md` SHALL fail independently for that reference
- **AND** the overall gate result SHALL be fail because the conditional provenance rule failed
- **AND** safe artifacts SHALL NOT be flagged as orphan or bypass-suspected

### Requirement: Gate SHALL detect suspected relay bypass by phase

Gate CLI SHALL automatically write a `relay_bypass_suspected` trace event to `rb_trace.jsonl` and a WARN entry to `_logs/run.log` when phase artifacts indicate evidence/search work but matching phase-scoped relay provenance is absent.

For Wave0/Wave1, current-wave artifact/source/reference files without current-wave output declaration coverage or successful current-wave slot binding SHALL trigger suspicion.

For Wave2, pure synthesis/backfill artifacts SHALL NOT trigger suspicion. Wave2 suspicion SHALL be limited to search/evidence outputs such as `reference/00-cross-*.md`, gap-fill search artifacts, or finding-index search claims (`decision: exploit_search` / `decision: explore_search`, `search_required: true`, or expected/non-empty `subagent_receipt_refs`) without matching Wave2 relay markers.

This detection SHALL run regardless of whether the gate definition includes provenance rules. It is always-on diagnostic instrumentation that runs before emitting the gate result. It SHALL NOT cause filesystem-only artifacts to count toward gate pass. It is diagnostic evidence, not an alternative authority source.

#### Scenario: Wave1 artifacts present but only Wave0 provenance triggers suspicion

- **WHEN** `artifacts/wave1/topic-a/evidence-summary.md` exists
- **AND** matching Wave1 ledger coverage or Wave1 successful slot binding is missing
- **THEN** gate CLI SHALL write `relay_bypass_suspected`
- **AND** the event SHALL include the gate, phase, artifacts found, and missing current-wave provenance markers

#### Scenario: Wave2 synthesis artifacts alone do not trigger bypass suspicion

- **WHEN** `artifacts/wave2/synthesis.md`, `artifacts/wave2/cross-topic-ledger.md`, and `artifacts/wave2/finding-index.yaml` exist
- **AND** `_subagents/wave_02/` is missing
- **AND** no Wave2 search/reference outputs are present
- **THEN** gate CLI SHALL NOT write `relay_bypass_suspected` for relay absence alone

### Requirement: Provenance checks SHALL coexist with structural checks in gate definitions

Provenance check types (`output_declaration_ledger_exists`, `output_declaration_coverage`, `subagent_slot_presence`) SHALL be standard `check` values in gate definition JSON files using the same rule structure as existing check types.

Gate CLI rule evaluation SHALL dispatch to provenance checks through the same `rule.check` switch as all other check types. Provenance checks SHALL NOT require a separate CLI or a separate gate pass.

Provenance checks SHALL NOT change the authority source of existing `count_floor` or content checks. Engine-written `rb_output_declarations.jsonl` remains the authoritative index of Agent-produced reference outputs; filesystem scans MAY support orphan diagnostics but SHALL NOT satisfy ledger-authoritative pass conditions.

#### Scenario: Provenance rule in gate definition

- **WHEN** `gate-wave0-complete.definition.json` contains a rule with `"check": "output_declaration_coverage"`
- **THEN** the gate CLI SHALL evaluate it in the rule evaluation loop
- **AND** the rule SHALL contribute to the overall pass/fail determination

#### Scenario: Provenance check uses standard gate result shape

- **WHEN** an `output_declaration_coverage` check fails
- **THEN** the failure SHALL appear in `inspect` with the rule's `failure_message`
- **AND** the `advice` SHALL contain actionable guidance
- **AND** the output JSON SHALL use the standard `{ check, routing, inspect, advice }` shape
