# Agent Output Declaration (delta)

> req: AGO-001, AGO-002, AGO-003, AGO-004, AGO-005, AGO-006

## Purpose

Upgrade `rb_output_declarations.jsonl` from a relay side effect to mandatory provenance proof for reference/evidence-producing relay outputs. Gate provenance uses the ledger for scoped existence and output declaration coverage. Also preserve the deterministic slot-result commit boundary — quality policy stays in gate, not in `commitSlotResult()`.

## MODIFIED Requirements

### Requirement: complete() SHALL write bundle-level output declaration ledger

`complete()` SHALL remain the only supported writer of bundle root `rb_output_declarations.jsonl`. Agent、Phase Agent、Sub-agent MUST NOT directly append ledger records.

`OutputDeclarationLedgerRecord.cache_trails` SHALL be populated by Engine in `appendOutputDeclarationLedger()` from the verified subset of slot result candidate `cache_trails`. Cache validation keeps the accepted Phase 1 strategy defined in `cache-raw-web-content` (CRC-006): empty trails emit warning; non-empty missing/unmapped trails remain blocking at `cache_coverage`.

Downstream gates SHALL treat `rb_output_declarations.jsonl` as the authoritative index of Agent-produced outputs.

**变更**: `rb_output_declarations.jsonl` 的角色从 "relay side effect" 升级为 reference/evidence-producing relay output 的 mandatory provenance proof. For this change, gate provenance uses the ledger in two ways:

- scoped ledger existence proves delegated `complete()` happened in the current wave
- output declaration coverage proves current-wave artifacts/references being evaluated are declared in Engine-written `output_files[]`

Wave0/Wave1 gate provenance relies on current-wave output declaration coverage plus successful current-wave subagent slot binding. Wave2 main-agent synthesis/backfill does not require a Wave2 ledger entry by itself; Wave2 new search/evidence/reference outputs, including promoted `reference/00-cross-*.md`, SHALL be ledger-covered.

Phase Agent 手工创建的 ledger（不通过 relay `complete()` 写入）不被 engine 签名机制阻止 in this change. However, current-wave slot binding, runtime receipt references, output path coverage, cache trail policy, and bypass diagnostics SHALL surface missing relay provenance. Full cryptographic ledger signing remains out of scope.

#### Scenario: Ledger provides current-wave output coverage

- **WHEN** `gate-wave1-complete` evaluates an `output_declaration_coverage` rule scoped to `wave1`
- **AND** `rb_output_declarations.jsonl` was appended by delegated `complete()` through relay
- **AND** its `output_files[]` declares the current Wave1 evidence and reference paths being evaluated
- **THEN** the ledger SHALL satisfy the coverage portion of provenance
- **AND** `subagent_slot_presence` SHALL still verify successful current-wave relay slot binding

#### Scenario: Filesystem-only output is not covered

- **WHEN** `artifacts/wave1/topic-a/evidence-summary.md` exists on disk
- **AND** no current-wave ledger record declares that path in `output_files[]`
- **THEN** downstream gate provenance SHALL treat it as orphan/direct-written output
- **AND** the file SHALL NOT satisfy coverage or countability by filesystem presence alone

#### Scenario: Wave2 pure synthesis does not require declaration ledger

- **WHEN** Wave2 produced only `artifacts/wave2/synthesis.md`, `artifacts/wave2/cross-topic-ledger.md`, `artifacts/wave2/finding-index.yaml`, and seed-topic backfill edits
- **AND** no Wave2 search/gap-fill/promoted reference outputs exist
- **THEN** absence of a Wave2 scoped output declaration SHALL NOT by itself fail Wave2 gate

#### Scenario: Wave2 promoted reference is ledgered

- **WHEN** Wave2 gap-fill search produces `reference/00-cross-market-shift.md`
- **THEN** delegated `complete()` SHALL append an output declaration ledger record declaring that reference
- **AND** downstream Wave2 conditional provenance checks SHALL be able to match it as Wave2 search evidence

## ADDED Requirements

### Requirement: Slot result commit SHALL preserve deterministic boundary only

`commitSlotResult()` SHALL remain the deterministic slot-result commit boundary. It SHALL validate SlotResult schema, slot identity, result status, bundle-relative output paths, and declared output shape before writing `result.json`.

This change SHALL keep accepted gate/reference quality policy out of the slot-result commit boundary. In particular, `reference_format`、`key_facts_min_lines`、`source_url_article_level`、`cache_coverage`、and Jaccard `content_dedup` keep their accepted capability semantics unless a corresponding capability delta explicitly changes them.

`commitSlotResult()` MAY emit deterministic diagnostics for slot-local declaration problems such as duplicate `source_url` values within the same slot result. Such diagnostics SHALL NOT replace delegated `complete()` provenance validation, ledger coverage, cache trail policy, or gate ledger authority.

#### Scenario: Slot result commit validates declarations without rewriting quality policy

- **WHEN** `commitSlotResult()` receives a SlotResult with valid schema, bundle-relative output paths, and required reference `source_url` declarations
- **THEN** the slot result MAY be committed
- **AND** downstream delegated `complete()` SHALL still validate runtime receipt, declared files, and cache trail filtering before appending `rb_output_declarations.jsonl`
- **AND** downstream gates SHALL still consume the Engine-written ledger according to accepted specs

#### Scenario: Slot-local duplicate URL is diagnostic

- **WHEN** one SlotResult declares two role=`reference` outputs with the same normalized `source_url`
- **THEN** the Engine MAY record a deterministic diagnostic identifying both output files
- **AND** this diagnostic SHALL NOT grant filesystem files authority or bypass ledger-driven gate checks
