> req: IOC-001, IOC-003

## MODIFIED Requirements

### Requirement: inspect-wave0-output.mjs structural checks

`inspect-wave0-output.mjs` SHALL evaluate Wave0 gate-consumable artifact and provenance contracts through the same pure evaluator result used by `wave0-complete`. It SHALL also continue to inspect the existing Wave0-only structure conventions:

1. `reference/` has no non-hidden subdirectory;
2. non-index/readme Markdown files use `00-shared-<slug>.md` naming;
3. each `00-shared-*.md` exposes the eight common required bullet metadata keys plus one resolvable topic binding after an optional H1 title and before its first H2 semantic section;
4. each `00-shared-*.md` exposes the five standard semantic sections;
5. `reference/_INDEX.md` exists and inspect can diagnose the expected eight columns and data-row shape;
6. `reference/README.md` exists and inspect can diagnose empty content; and
7. `artifacts/wave0/<topic>/source.yaml` exists for every `topic_registry` topic and satisfies the accepted ReferenceMetadata array contract.

Reference metadata inspection SHALL consume the shared canonical topic-binding adapter used by Wave gates and file observability. Exact `related_topic_uid`, existing legacy `related_topic`, and identical dual declarations SHALL satisfy the one topic-binding slot; the inspect-only convention SHALL NOT hard-code the legacy raw field as independently required or maintain its own topic parser. Unknown, ambiguous, or conflicting binding SHALL be reported with the adapter reason code and one reference repair target.

The shared blocking evaluator SHALL cover the current formal Wave0 artifact/provenance rules: `reference/`、`_INDEX.md`、`README.md` existence, shared-reference count floor, placeholder `source_url`, per-topic source YAML existence/schema/count, cache coverage, submitted ledger/output/submission presence, and delegated-bypass provenance. A formal condition SHALL use the same rule id and direct checker result in inspect and gate modes.

Wave0 flat-directory, filename, non-formal metadata/section, `_INDEX.md` presentation, and README non-empty conventions SHALL remain visible but SHALL be advisory unless an accepted formal rule directly consumes that shape. Missing formal artifacts remain blocking. Existing evidence-bearing return-map navigation checks SHALL preserve their accepted current-command classification and SHALL NOT be mislabeled as formal gate rules.

Inspect SHALL return `{ check, inspect, advice, hints }` JSON without routing. Every blocking primary root SHALL expose `rule_id`, `missing_fact`, `write_to`, and `rerun` through the same shared finding projection used by the corresponding Wave Gate while preserving existing human-readable arrays for compatibility. On pass, `hints` SHALL be empty. It SHALL preserve exit code `0` for pass, `1` for known contract failure, and `2` for invocation/configuration error. It SHALL NOT execute node binding, lifecycle handoff preflight, routing, degraded handoff, gate-attempt counting, trace/log/checkpoint writes, status mutation, or completion-only `trace_event_*` checks.

#### Scenario: Flat directory check passes

- **WHEN** `reference/` contains only Markdown files and no non-hidden subdirectory
- **THEN** the flat-directory convention SHALL pass without advisory

#### Scenario: Flat directory check reports subdirectory

- **WHEN** `reference/` contains a subdirectory such as `reference/01_topic/`
- **THEN** inspect SHALL report `reference/: contains subdirectory '01_topic/' — directory must be flat`
- **AND** advice SHALL direct the Agent to flatten the files and remove the empty subdirectory
- **AND** this inspect-only maintenance convention SHALL NOT independently fail the shared gate-contract result

#### Scenario: Naming check reports unexpected file

- **WHEN** `reference/` contains `notes.md` rather than a `00-shared-<slug>.md` name
- **THEN** inspect SHALL report the unexpected filename and nearest rename/move repair
- **AND** filename preference alone SHALL be advisory when no formal rule consumes it

#### Scenario: H1 title does not hide metadata

- **WHEN** `reference/00-shared-ai-landscape.md` starts with an H1 title followed by all required bullet metadata before the first H2 semantic section
- **THEN** inspect SHALL recognize the metadata keys
- **AND** it SHALL not report them missing merely because the H1 title exists

#### Scenario: Metadata check reports missing key

- **WHEN** `reference/00-shared-ai-landscape.md` lacks metadata key `trust_level`
- **THEN** inspect SHALL name the file and missing key
- **AND** the finding SHALL be advisory when that key is not part of a formal Wave0 pass/fail rule

#### Scenario: UID-only shared reference satisfies inspect binding

- **WHEN** a Wave0 shared reference contains all common required metadata and exact registered `related_topic_uid` but no legacy `related_topic`
- **THEN** Wave0 inspect SHALL accept the topic-binding slot without a missing-key advisory
- **AND** it SHALL return the same canonical UID binding as file observability

#### Scenario: Section check reports missing header

- **WHEN** `reference/00-shared-ai-landscape.md` lacks the `Risks And Limitations` semantic section
- **THEN** inspect SHALL name the file and missing section
- **AND** equivalent harmless heading presentation SHALL be accepted or advisory rather than a shared blocker

#### Scenario: _INDEX.md header validation

- **WHEN** `reference/_INDEX.md` exists but its table header lacks `source_layer`
- **THEN** inspect SHALL report the missing expected column
- **AND** the formal existence rule SHALL remain distinct from this inspect-only presentation diagnostic

#### Scenario: README.md missing or empty

- **WHEN** `reference/README.md` is missing
- **THEN** inspect SHALL fail the shared formal existence rule
- **WHEN** the file exists but is empty
- **THEN** inspect SHALL report the non-empty convention as advisory unless the formal rule is intentionally changed by a future spec

#### Scenario: Wave0 inspect reuses gate contract without side effects

- **WHEN** Wave0 inspect evaluates a bundle with a shared artifact/provenance failure
- **THEN** the blocking finding SHALL use the same rule id and direct checker result as `wave0-complete`
- **AND** a recursive before/after bundle snapshot SHALL show no file creation, deletion, or content change

#### Scenario: Wave0 inspect preserves command output contract

- **WHEN** `inspect-wave0-output.mjs --bundle <bundle>` completes
- **THEN** stdout SHALL contain `{ check, inspect, advice, hints }` without routing
- **AND** any affected blocking primary root SHALL include non-empty `missing_fact`, `write_to`, and `rerun`
- **AND** the command SHALL use exit code `0`, `1`, or `2` according to the documented non-gate convention


### Requirement: inspect-wave1-output.mjs structural checks

`inspect-wave1-output.mjs` SHALL evaluate Wave1 phase-owned artifacts, structured depth-review, references, submitted ledger/cache backing, explicit profile floors and work-unit provenance through the same pure evaluator result used by `wave1-complete`. It SHALL consume the shared canonical topic-binding, reference-format, reference-index, depth-contract and provenance evaluators rather than maintain local blocking variants.

Presentation parsing SHALL remain tolerant without weakening direct contracts:

- `question_list_has_four_sections` SHALL require the four semantic sections but tolerate harmless order, heading case/level, spacing and list presentation;
- `source_url_present` SHALL accept a parseable bare HTTP(S) URL or Markdown link while submitted source/backing remains independently blocking;
- `key_findings_non_empty` SHALL accept common non-empty bullet, numbered-list or paragraph content under the semantic Key Findings section; and
- the retired `key_facts_min_lines` blocking rule SHALL be removed; a Key Facts quantity observation MAY remain advisory and SHALL NOT appear in `check.failed_rule_ids` or `hints[]`.

When a prerequisite parent or field is missing, inspect SHALL return the earliest direct root and mask only dependent novelty, cache-mapping, floor, profile, decision, output and count symptoms. `submitted_declaration_missing` SHALL precede dependent work-unit coverage/cache/count symptoms. An invalid reference-index table SHALL precede per-reference missing-row symptoms.

Inspect SHALL preserve `{ check, inspect, advice, hints }`, exit code `0/1/2`, no routing and full bundle no-write behavior. Shared blocking roots SHALL expose the same `rule_id`, `missing_fact` and `write_to` as the formal Gate, with the exact Wave1 inspect command in `rerun`. Formal-only lifecycle, routing, degraded handoff, gate-attempt durability and trace completion checks SHALL remain outside inspect.

#### Scenario: Retired Key Facts quantity does not create a hint

- **WHEN** a reference has all required semantic sections and direct backing but fewer than five Key Facts bullets
- **THEN** Wave1 inspect SHALL not fail or emit a blocking hint for quantity
- **AND** any quantity feedback SHALL be advisory only

#### Scenario: Wave1 inspect returns the shared root without side effects

- **WHEN** Wave1 inspect and formal Gate evaluate the same unchanged shared rule failure
- **THEN** they SHALL agree on `rule_id`, `missing_fact` and `write_to`
- **AND** Wave1 inspect SHALL name its own exact command in `rerun` and SHALL not write routing, trace, log, checkpoint or status state


### Requirement: inspect-wave2-output.mjs structural checks

`inspect-wave2-output.mjs` SHALL evaluate Wave2 triple artifacts, finding-index contract, semantic ledger sections, synthesis references, backfill, reference index/backing, cross-reference authority, and submitted targeted-evidence provenance through the same pure evaluator result used by `wave2-complete`. It SHALL continue to inspect the existing Wave2-only conventions:

1. absence of legacy `reference/00_shared/` layout;
2. common metadata, one resolvable topic binding, and semantic-section shape of optional `reference/00-cross-*.md` files;
3. matching `reference/_INDEX.md` rows for materialized `00-cross` files;
4. non-empty `synthesis.md`, six-section `cross-topic-ledger.md`, and parseable/contract-valid `finding-index.yaml`; and
5. absence of Wave2 backfill tokens in `seed_topics/*.md`.

Cross-reference metadata inspection SHALL consume the same canonical reference-binding adapter as Wave1 and file observability. It SHALL accept exact UID-only, valid legacy, or identical dual binding without requiring the raw legacy field, and SHALL report one adapter conflict/ambiguity root rather than per-field missing/dangling advice.

Triple artifacts, finding structured fields, six semantic ledger sections, synthesis/backfill/cross-artifact contracts, reference navigation/backing, explicit floors, and targeted-evidence/submitted provenance SHALL remain blocking where they are formal rules. Heading marker, spacing, and equivalent case differences SHALL be parsed tolerantly while semantic sections remain required.

Legacy `00_shared/` layout and `00-cross` metadata/standard-section presentation that is not consumed by direct authority SHALL remain visible as advisory. `source_url`, prior/submitted backing refs, index coverage, and provenance needed to classify a cross reference SHALL remain blocking.

A missing required finding field SHALL be reported before and SHALL short-circuit only implications that consume that field. The primary output SHALL not expand one missing field into repeated enum, handoff, eligibility, backing, and synthesis symptoms. Missing/unparseable finding-index parent or non-array `findings` SHALL mask dependent per-finding and derived-count checks.

Inspect SHALL preserve `{ check, inspect, advice, hints }`, exit code `0/1/2`, no routing, and full bundle no-write behavior. Blocking roots SHALL include the same `missing_fact` and `write_to` coordinates as the shared formal evaluator, with inspect's own exact command in `rerun`. Formal gate and inspect SHALL agree on shared rule ids; only formal gate may evaluate lifecycle checks, apply degraded behavior, or write durable evidence.

#### Scenario: Detects 00_shared/ subdirectory

- **WHEN** `reference/00_shared/` exists
- **THEN** inspect SHALL report the legacy layout and advise flat `reference/00-cross-*.md` files
- **AND** layout preference alone SHALL be advisory when direct authority/provenance remains valid

#### Scenario: Passes with no cross files

- **WHEN** `reference/` contains no `00-cross-*.md` files
- **THEN** optional cross-file format/index checks SHALL pass
- **AND** other Wave2 artifact and provenance rules SHALL still run

#### Scenario: UID-only cross reference satisfies inspect binding

- **WHEN** an optional `00-cross` reference has all common required metadata and one exact registered `related_topic_uid`
- **THEN** Wave2 inspect SHALL not advise adding legacy `related_topic`
- **AND** its canonical binding result SHALL agree with Wave1/file observability consumers

#### Scenario: Detects missing wave2 artifacts

- **WHEN** `artifacts/wave2/synthesis.md` is missing
- **THEN** inspect SHALL report the missing formal artifact and fail the shared rule

#### Scenario: Detects unreplaced backfill token

- **WHEN** a `seed_topics/*.md` file contains `__BACKFILL_WAVE2_JUDGMENT__`
- **THEN** inspect SHALL report the exact file and token as a blocking shared failure

#### Scenario: Detects missing ledger sections

- **WHEN** `cross-topic-ledger.md` lacks the HITL2 Handoff semantic section
- **THEN** inspect SHALL report the missing section
- **AND** harmless heading whitespace or marker differences SHALL not be the sole cause of failure

#### Scenario: missing finding field produces one root repair target

- **WHEN** `finding-index.yaml` contains a finding missing `hitl2_handoff`
- **THEN** Wave2 inspect SHALL report the finding, missing field, expected shape, and bundle-relative artifact as the primary root cause
- **AND** dependent handoff/eligibility/synthesis/backing implications SHALL be masked or retained only as non-primary detail

#### Scenario: Wave2 inspect and formal gate agree

- **WHEN** the same unchanged bundle is evaluated by Wave2 inspect and then by the formal Wave2 gate
- **THEN** shared artifact/provenance failed rule ids SHALL agree
- **AND** only formal gate SHALL add lifecycle-only failures or write gate attempt, bypass diagnostic, checkpoint, and routing evidence


### Requirement: Inspect CLIs are documented non-gate structured-output commands

Wave inspect CLIs SHALL preserve the non-gate `{ check, inspect, advice, hints }` JSON stdout contract and no-routing behavior for every completed invocation, including caller invocation and configuration failures. Pass SHALL return `hints: []`. A known contract, invocation, or definition/config failure SHALL return a stable structured root with `rule_id`, `missing_fact`, authorized `write_to`, and checkpoint-appropriate `rerun`; it SHALL NOT fall back to stderr-only usage text or hand-built `{check,inspect,advice}` without `hints[]`.

Exit codes SHALL remain `0` for pass, `1` for known inspected-contract failure, and `2` for invocation/configuration failure. A missing `--bundle` value SHALL identify the missing required argument and return a command template containing `<bundle-path>`; because no runtime bundle was resolved, it SHALL NOT fabricate an absolute path. A definition parse/load failure SHALL preserve the same Gate-definition schema coordinate returned by the shared parser and SHALL identify framework maintenance or `missing_contract` ownership rather than suggesting edits inside an arbitrary run bundle.

Shared artifact/provenance failures SHALL be projected from the same `wave-contract-findings.mjs` finding used by the formal Gate. Inspect-only advisory findings MAY use that same shape, but SHALL remain non-blocking and SHALL NOT acquire formal routing or durable side effects.

#### Scenario: Missing bundle still returns structured inspect JSON

- **WHEN** `inspect-wave1-output.mjs` is invoked without a bundle argument
- **THEN** stdout SHALL contain `{ check, inspect, advice, hints }` with a stable invocation root and exit code `2`
- **AND** the hint SHALL show the required `--bundle <bundle-path>` command template without claiming an absolute bundle root

#### Scenario: Definition configuration failure cannot omit repair coordinates

- **WHEN** a Wave inspect CLI cannot schema-parse its Gate definition
- **THEN** it SHALL return exit code `2` with a structured definition/config root in `hints[]`
- **AND** it SHALL NOT emit an inspect/advice-only object or suggest editing runtime artifacts to repair framework configuration
