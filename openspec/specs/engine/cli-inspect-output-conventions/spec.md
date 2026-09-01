# CLI Inspect Output Conventions

> req: IOC-001, IOC-002, IOC-003, IOC-004, IOC-005

## Purpose

定义三个独立的 wave-specific 结构 lint CLI：`inspect-wave0-output.mjs`、`inspect-wave1-output.mjs`、`inspect-wave2-output.mjs`。每个 CLI 只检查自己 wave 的输出约定，不读 `current_gate`，不继承其他 wave。Agent 在对应 wave 中途跑，拿到 inspect/advice 反馈。不是 gate（不控制 phase 前进，不写 trace，不输出 routing）。
## Requirements
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

Inspect SHALL return `{ check, inspect, advice, hints }` JSON without routing. Every blocking primary root SHALL expose `rule_id`, `repair_kind`, `missing_fact`, `write_to`, and `rerun` through the same shared finding projection used by the corresponding Wave Gate while preserving existing human-readable arrays for compatibility. On pass, `hints` SHALL be empty. It SHALL preserve exit code `0` for pass, `1` for known contract failure, and `2` for invocation/configuration error. It SHALL NOT execute node binding, lifecycle handoff preflight, routing, degraded handoff, gate-attempt counting, trace/log/checkpoint writes, status mutation, or completion-only `trace_event_*` checks.

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
- **AND** any affected blocking primary root SHALL include non-empty `repair_kind`, `missing_fact`, `write_to`, and `rerun`
- **AND** the command SHALL use exit code `0`, `1`, or `2` according to the documented non-gate convention

### Requirement: inspect-wave1-output.mjs structural checks

`inspect-wave1-output.mjs` SHALL evaluate Wave1 phase-owned artifacts, structured depth-review, references, submitted ledger/cache backing, explicit profile floors and work-unit provenance through the same pure evaluator result used by `wave1-complete`. It SHALL consume the shared canonical topic-binding, reference-format, reference-index, depth-contract and provenance evaluators rather than maintain local blocking variants.

Presentation parsing SHALL remain tolerant without weakening direct contracts:

- `question_list_has_four_sections` SHALL require the four semantic sections but tolerate harmless order, heading case/level, spacing and list presentation;
- `source_url_present` SHALL accept a parseable bare HTTP(S) URL or Markdown link while submitted source/backing remains independently blocking;
- `key_findings_non_empty` SHALL accept common non-empty bullet, numbered-list or paragraph content under the semantic Key Findings section; and
- the retired `key_facts_min_lines` blocking rule SHALL be removed; a Key Facts quantity observation MAY remain advisory and SHALL NOT appear in `check.failed_rule_ids` or `hints[]`.

When a prerequisite parent or field is missing, inspect SHALL return the earliest direct root and mask only dependent novelty, cache-mapping, floor, profile, decision, output and count symptoms. `submitted_declaration_missing` SHALL precede dependent work-unit coverage/cache/count symptoms. An invalid reference-index table SHALL precede per-reference missing-row symptoms.

Inspect SHALL preserve `{ check, inspect, advice, hints }`, exit code `0/1/2`, no routing and full bundle no-write behavior. Shared blocking roots SHALL expose the same `rule_id`, `repair_kind`, `missing_fact` and `write_to` as the formal Gate, with the exact Wave1 inspect command in `rerun`. Formal-only lifecycle, routing, degraded handoff, gate-attempt durability and trace completion checks SHALL remain outside inspect.

#### Scenario: Retired Key Facts quantity does not create a hint

- **WHEN** a reference has all required semantic sections and direct backing but fewer than five Key Facts bullets
- **THEN** Wave1 inspect SHALL not fail or emit a blocking hint for quantity
- **AND** any quantity feedback SHALL be advisory only

#### Scenario: Wave1 inspect returns the shared root without side effects

- **WHEN** Wave1 inspect and formal Gate evaluate the same unchanged shared rule failure
- **THEN** they SHALL agree on `rule_id`, `repair_kind`, `missing_fact` and `write_to`
- **AND** Wave1 inspect SHALL name its own exact command in `rerun` and SHALL not write routing, trace, log, checkpoint or status state

#### Scenario: Detects missing topic reference files

- **WHEN** `topic_registry` contains topic id `03`
- **AND** `reference/` contains no matching `03-*.md` or canonical topic-slug-prefixed reference
- **THEN** inspect SHALL report that topic `03` has no Wave1 reference file

#### Scenario: Checks 0N-*.md metadata completeness

- **WHEN** `reference/03-block-goose.md` exists but lacks metadata key `why_it_matters`
- **THEN** inspect SHALL name the file and missing required metadata key

#### Scenario: Checks 0N-*.md section completeness

- **WHEN** `reference/03-block-goose.md` exists but lacks the `Core Content Capture` semantic section
- **THEN** inspect SHALL name the file and missing semantic section

#### Scenario: Wave1 inspect exposes formal gate root cause before gate

- **WHEN** a Phase Agent runs Wave1 inspect after phase-owned artifacts are materialized
- **AND** a required depth-review field or submitted provenance binding is missing
- **THEN** inspect SHALL fail with the same root rule id used by `wave1-complete`
- **AND** advice SHALL name the bundle-relative repair surface without requiring Engine source reading

#### Scenario: equivalent Markdown presentation does not block

- **WHEN** Wave1 Markdown contains the required semantic sections and direct structured backing but uses equivalent harmless whitespace, heading, or list style
- **THEN** the tolerant parser SHALL accept it or report advisory feedback
- **AND** the presentation difference SHALL NOT independently fail the shared Wave1 result

#### Scenario: Source URL parser accepts equivalent direct URL forms

- **WHEN** `evidence-summary.md` contains a parseable bare `https://` URL rather than a Markdown link
- **THEN** `source_url_present` SHALL treat the URL marker as present
- **AND** independent submitted-source and backing checks SHALL still apply

#### Scenario: Missing depth review short-circuits derivative checks

- **WHEN** `artifacts/wave1/<topic>/depth-review.yaml` is missing or unparseable
- **THEN** primary inspect output SHALL report that parent failure
- **AND** dependent novelty, cache mapping, profile, floor, and decision rules SHALL be listed as masked or omitted from primary failures

### Requirement: Wave inspect SHALL report canonical UID subset binding

Wave inspect output SHALL use the common reference-binding adapter for a
`related_topic_uids` current metadata array. A valid exact subset SHALL satisfy
the topic-binding prerequisite without legacy-field advice. An invalid subset
SHALL expose one adapter-owned binding root with the affected array coordinate;
inspect SHALL not add per-UID or dependent metadata noise.

An inspected reference containing `related_topic`, alone or beside a current
UID form, SHALL expose the same
`reference_topic_binding_legacy_unsupported` root as Gate, index, provenance,
and file observability. Inspect SHALL name the reference metadata boundary and
SHALL not parse the legacy id/slug, emit a consumer-specific fallback, advise a
silent conversion, or present the file as current countable evidence.

#### Scenario: Wave2 inspect accepts a selected cross-Topic subset

- **WHEN** an optional `00-cross-*` reference has valid common metadata,
  semantic sections, and a valid selected UID subset with no `related_topic`
- **THEN** Wave2 inspect SHALL accept its topic-binding form
- **AND** it SHALL not advise `related_topic` or convert the subset to `all`

#### Scenario: Inspect reports the common legacy rejection boundary

- **WHEN** a Wave inspect command reads a reference containing `related_topic`
- **THEN** inspect SHALL return one
  `reference_topic_binding_legacy_unsupported` finding for that reference
- **AND** it SHALL not add an id/slug lookup result or a dependent countability
  symptom as a competing primary repair action

### Requirement: inspect-wave2-output.mjs structural checks

`inspect-wave2-output.mjs` SHALL evaluate Wave2 triple artifacts, finding-index contract, semantic ledger sections, synthesis references, backfill, reference index/backing, cross-reference authority, and submitted targeted-evidence provenance through the same pure evaluator result used by `wave2-complete`. It SHALL continue to inspect the existing Wave2-only conventions:

1. absence of legacy `reference/00_shared/` layout;
2. common metadata, one resolvable topic binding, and semantic-section shape of optional `reference/00-cross-*.md` files;
3. matching `reference/_INDEX.md` rows for materialized `00-cross` files;
4. non-empty `synthesis.md`, six-section `cross-topic-ledger.md`, and parseable/contract-valid `finding-index.yaml`; and
5. absence of Wave2 backfill tokens in `seed_topics/*.md`.

Cross-reference metadata inspection SHALL consume the same canonical reference-binding adapter as Wave1 and file observability. It SHALL accept exact UID-only, valid legacy, or identical dual binding without requiring the raw legacy field, and SHALL report one adapter conflict/ambiguity root rather than per-field missing/dangling advice.

Triple artifacts, finding structured fields, six non-empty semantic ledger sections, synthesis/backfill/cross-artifact contracts, reference navigation/backing, explicit floors, and targeted-evidence/submitted provenance SHALL remain blocking where they are formal rules. The historical `ledger_fixed_sections` rule id MAY remain for compatibility, but its evaluator SHALL treat the six required sections as a set and SHALL tolerate section order, heading level, spacing, and equivalent case differences.

Legacy `00_shared/` layout and `00-cross` metadata/standard-section presentation that is not consumed by direct authority SHALL remain visible as advisory. `source_url`, prior/submitted backing refs, index coverage, and provenance needed to classify a cross reference SHALL remain blocking.

A missing required finding field SHALL be reported before and SHALL short-circuit only implications that consume that field. The primary output SHALL not expand one missing field into repeated enum, handoff, eligibility, backing, and synthesis symptoms. Missing/unparseable finding-index parent or non-array `findings` SHALL mask dependent per-finding and derived-count checks.

Inspect SHALL preserve `{ check, inspect, advice, hints }`, exit code `0/1/2`, no routing, and full bundle no-write behavior. Blocking roots SHALL include the same `repair_kind`, `missing_fact` and `write_to` coordinates as the shared formal evaluator, with inspect's own exact command in `rerun`. Formal gate and inspect SHALL agree on shared rule ids; only formal gate may evaluate lifecycle checks, apply degraded behavior, or write durable evidence.

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

#### Scenario: Reordered Wave2 ledger sections remain valid

- **WHEN** `cross-topic-ledger.md` contains all six required non-empty semantic sections in a different order or equivalent heading level/case
- **THEN** Wave2 inspect and formal Gate SHALL accept the section contract
- **AND** the historical ordered regex SHALL NOT remain a hidden blocking path

#### Scenario: missing finding field produces one root repair target

- **WHEN** `finding-index.yaml` contains a finding missing `hitl2_handoff`
- **THEN** Wave2 inspect SHALL report the finding, missing field, expected shape, and bundle-relative artifact as the primary root cause
- **AND** dependent handoff/eligibility/synthesis/backing implications SHALL be masked or retained only as non-primary detail

#### Scenario: Wave2 inspect and formal gate agree

- **WHEN** the same unchanged bundle is evaluated by Wave2 inspect and then by the formal Wave2 gate
- **THEN** shared artifact/provenance failed rule ids SHALL agree
- **AND** only formal gate SHALL add lifecycle-only failures or write gate attempt, bypass diagnostic, checkpoint, and routing evidence

### Requirement: Inspect CLIs are documented non-gate structured-output commands

Wave inspect CLIs SHALL preserve the non-gate `{ check, inspect, advice, hints }` JSON stdout contract and no-routing behavior for every completed invocation, including caller invocation and configuration failures. Pass SHALL return `hints: []`. A known contract, invocation, or definition/config failure SHALL return a stable structured root with `rule_id`, `repair_kind`, `missing_fact`, exact next-action coordinate `write_to`, and checkpoint-appropriate `rerun`; it SHALL NOT fall back to stderr-only usage text or hand-built `{check,inspect,advice}` without `hints[]`.

Exit codes SHALL remain `0` for pass, `1` for known inspected-contract failure, and `2` for invocation/configuration failure. A missing `--bundle` value SHALL identify the missing required argument and return a command template containing `<bundle-path>`; because no runtime bundle was resolved, it SHALL NOT fabricate an absolute path. A definition parse/load failure SHALL preserve the same Gate-definition schema coordinate returned by the shared parser and SHALL use `repair_kind: missing_contract` with the exact framework contract boundary rather than suggesting edits inside an arbitrary run bundle.

Shared artifact/provenance failures SHALL be projected from the same shared contract-finding projection used by the formal Gate. Inspect-only advisory findings MAY use that same shape, but SHALL remain non-blocking and SHALL NOT acquire formal routing or durable side effects.

Before resolving a bundle or loading a Wave definition, each Wave inspect CLI
SHALL parse its public invocation. Its only legal forms are one standalone
`--help` or `-h`, or exactly one `--bundle <bundle-path>` pair with no positional
arguments. Help SHALL write its static usage/help response, exit `0`, and
perform no bundle read, evaluator call, or side effect. A bare positional path,
missing, duplicate, unknown, incomplete, option-looking, or
nonexistent/not-directory bundle argument SHALL instead return the existing
structured non-gate invocation/configuration envelope with exit `2`. Only a
validated resolved bundle directory may appear in a domain finding's
`write_to`, `rerun`, or checkpoint command. An untrusted option token or an
unvalidated path SHALL never be reflected into those repair coordinates.

#### Scenario: Missing bundle still returns structured inspect JSON

- **WHEN** `inspect-wave1-output.mjs` is invoked without a bundle argument
- **THEN** stdout SHALL contain `{ check, inspect, advice, hints }` with a stable invocation root and exit code `2`
- **AND** the hint SHALL show the required `--bundle <bundle-path>` command template without claiming an absolute bundle root

#### Scenario: Definition configuration failure cannot omit repair coordinates

- **WHEN** a Wave inspect CLI cannot schema-parse its Gate definition
- **THEN** it SHALL return exit code `2` with a structured definition/config root in `hints[]`
- **AND** it SHALL NOT emit an inspect/advice-only object or suggest editing runtime artifacts to repair framework configuration

#### Scenario: Inspect failure is repairable output failure

- **WHEN** an inspect-wave CLI detects malformed or missing wave artifacts
- **THEN** it SHALL emit structured inspect/advice detail
- **AND** it SHALL use the documented non-gate failure class rather than phase-routing semantics

#### Scenario: Missing bundle is invocation error

- **WHEN** an inspect-wave CLI is called without the required bundle argument
- **THEN** it MAY use code `2` as caller invocation error
- **AND** the framework exit-code docs SHALL list this as a non-gate command class

#### Scenario: Help never becomes a Wave artifact verdict

- **WHEN** any `inspect-wave{0,1,2}-output.mjs` command is invoked with
  `--help` or `-h`
- **THEN** it SHALL exit `0` after static help output
- **AND** it SHALL not load a Gate definition, resolve a bundle, or emit a
  Wave-domain finding

#### Scenario: Unsafe invocation input cannot become a rerun command

- **WHEN** a Wave inspect caller supplies an option token or nonexistent path
  in place of a valid bundle directory
- **THEN** the command SHALL return one structured invocation/configuration
  root with exit `2`
- **AND** its `write_to`, `rerun`, and command hint SHALL use only a stable
  placeholder or a validated bundle coordinate, never the supplied token

#### Scenario: Bare bundle path is rejected before Wave evaluation

- **WHEN** an inspect-wave CLI receives `<bundle-path>` without `--bundle`
- **THEN** it SHALL return the structured non-gate invocation envelope with exit
  `2` before it resolves the path, loads a definition, or evaluates Wave output
- **AND** its repair coordinate SHALL use the documented `--bundle
  <bundle-path>` template rather than echo the supplied path

### Requirement: Inspect output SHALL classify blocking, advisory, and diagnostic-only findings accurately

Inspect CLIs and shared inspect helpers SHALL classify findings according to the current command result:

- `blocking`: contributes to `check.passed: false` for the current inspect command or names a formal gate failure condition;
- `advisory`: does not fail the current command and covers repair suggestions or presentation/maintenance preferences that are not authority blockers; and
- `diagnostic-only`: cannot by itself establish or revoke gate coverage and does not contribute to current command failure.

A finding SHALL NOT be labeled `diagnosticOnly: true` or described as diagnostic-only when the CLI counts it toward `check.passed: false`. Gate and inspect output MAY explain that a return map does not establish evidence authority, but that statement SHALL remain separate from whether the current consumer-navigation check is blocking.

For section-scoped seed projection findings, classification SHALL be based on the target wave entry family and current Wave inspect command only. A valid entry, concrete ref, token, row, or finding outside that family SHALL NOT change the classification. Within a usable family, every non-empty entry retains its own shape/navigation/lineage findings; accepted family lineage and demand-driven identity coverage use the valid entry/ref union, with no generic entry floor for a seed/wave that has no current row/finding demand. A current-wave token retains its accepted projection-subcheck skip but SHALL NOT suppress the existing Wave evaluator's stale-token finding. Without that token, an unavailable family is blocking only when current rows/findings demand projection, legacy-only finding omissions remain advisory, and no-demand historical seeds receive no migration finding. Current-round per-row/per-finding projection omissions are blocking for the mandatory pre-gate Wave inspect.

These return-map findings SHALL NOT be described as formal Gate findings unless a separate accepted contract and executable Gate rule actually consume them. This change SHALL preserve the current sequence in which Wave inspect passes before formal Wave Gate execution, without requiring the Gate CLI to emit matching return-map rule ids or classifications.

For blocking deterministic findings, inspect SHALL name the failing artifact/ref/field or rule, expected deterministic shape/canonical value, and one nearest repair surface. When a prerequisite failure makes downstream checks non-actionable, primary `inspect[]` SHALL contain the prerequisite root and SHALL mask, omit, or group dependent symptoms outside the primary repair list.

Repair classification SHALL follow the direct owner. Section/entry/row/finding omissions inside a readable canonically bound seed and finding-index projection fields are `agent_action` on the exact writable file/field. A missing/unbound seed SHALL produce a narrow Wave-inspect prerequisite derived from canonical topic-state seed-binding semantics, with `repair_kind: missing_contract` and the canonical diagnostic operation but without running the full topic-state progress/workspace inspect. Submitted ledger/index/manifest authority failures SHALL preserve the direct submitted owner's `missing_contract` or legal Engine-operation repair classification. Neither failure SHALL name an ad hoc seed edit as the repair. Every blocking finding emitted by a Wave inspect SHALL use that exact invoking inspect command as `rerun`.

Inspect SHALL preserve `check.passed`, `check.wave`, `check.checks_run`, `check.checks_failed`, `check.return_map_classification`, `inspect[]`, and `advice[]`. It SHALL add `check.failed_rule_ids` and:

```text
check.finding_classification = {
  blocking: [...ids],
  advisory: [...ids],
  diagnostic_only: [...ids]
}
```

`check.passed` SHALL be false exactly when the current command has one or more blocking findings. `check.failed_rule_ids` SHALL match blocking shared/command rule ids, and advisory/diagnostic-only ids SHALL NOT contribute to `checks_failed`. Summary fields SHALL not contradict the command result.

#### Scenario: Wave1 section masking is reported as blocking

- **WHEN** Wave0 content in a seed topic has a valid complete return-map entry
- **AND** the Wave1 target section has prose-only or incomplete evidence-bearing content
- **AND** Wave1 inspect detects the target-section contract failure
- **THEN** the finding SHALL be classified as `blocking`
- **AND** `check.passed` SHALL be false
- **AND** `check.failed_rule_ids` SHALL include the blocking rule id

#### Scenario: Current-round missing work_id includes repair coordinates

- **WHEN** a current-round eligible work-unit row is not referenced or dispositioned in its target seed section
- **THEN** inspect SHALL emit a blocking finding
- **AND** the finding SHALL include `repair_kind: agent_action`, a `missing_fact` naming the work_id and target section, `write_to` naming the seed file, and the exact same inspect command as `rerun`

#### Scenario: Anonymous disposition remains a blocking omission

- **WHEN** a current-round eligible row is paired only with a limitation entry using `refs: none`
- **AND** that entry has no entry-local exact `<work_id>/<n>` metadata or exact work-id token/path in parsed refs
- **THEN** Wave inspect SHALL classify the row omission as `blocking`
- **AND** repair feedback SHALL name the exact row and target seed section family

#### Scenario: Legacy Wave2 omission remains advisory

- **WHEN** a legacy Wave2 finding has no target-section projection reference
- **AND** the finding has no current-round marker
- **THEN** inspect SHALL classify the omission as `advisory`
- **AND** `check.passed` SHALL remain unaffected by that finding
- **AND** the advisory SHALL not appear in `check.failed_rule_ids`

#### Scenario: Missing family follows current versus legacy demand

- **WHEN** a seed has no usable Wave2 target-family member and no Wave2 token
- **THEN** a current affected finding SHALL produce one blocking family prerequisite for that seed and mask its dependent omission
- **AND** a legacy-only affected finding SHALL produce its per-finding/topic advisory without a blocking family prerequisite
- **AND** no finding demand SHALL produce no return-map migration finding

#### Scenario: Submitted authority root preserves repair owner

- **WHEN** row projection cannot run because submitted ledger/index/manifest authority is inconsistent
- **THEN** Wave inspect SHALL emit the direct authority prerequisite with its existing `missing_contract` or legal Engine-operation owner
- **AND** `write_to` SHALL NOT direct the Agent to edit a seed as a substitute
- **AND** dependent row omissions SHALL be masked

#### Scenario: Canonical seed binding gets a narrow prerequisite

- **WHEN** projection cannot run because a plan-bound seed file is missing or canonically unbound
- **THEN** Wave inspect SHALL emit one canonical seed-binding prerequisite with `repair_kind: missing_contract`
- **AND** its repair SHALL name `operate-topic-state inspect` as the diagnostic operation while `rerun` names the invoking Wave inspect
- **AND** it SHALL NOT inherit unrelated full topic-state progress/workspace prerequisites or classify an ad hoc section edit as the substitute repair
- **AND** dependent family/row/finding symptoms SHALL be masked

#### Scenario: Finding projection field root is Agent-repairable

- **WHEN** W2F-015 has an unknown `affected_topics` token or malformed current-round marker
- **THEN** Wave2 inspect SHALL emit one blocking inspect-only prerequisite with `repair_kind: agent_action`
- **AND** `write_to` SHALL identify W2F-015's exact finding-index field

#### Scenario: failed inspect command does not call its blocker diagnostic-only

- **WHEN** `inspect-wave1-output.mjs` fails because an evidence-bearing seed-topic return map has no concrete existing `reference/*.md`
- **THEN** the output SHALL classify that finding as blocking for the inspect command
- **AND** it SHALL NOT label that finding diagnostic-only
- **AND** `return_map_classification` SHALL NOT claim the failed return-map check is diagnostic-only

#### Scenario: advisory map-shape issue remains advisory

- **WHEN** a return-map issue does not affect the current command pass/fail
- **THEN** inspect output MAY classify it as advisory or diagnostic-only
- **AND** it SHALL explain that submitted ledgers and gate checks remain evidence authority

#### Scenario: gate output names blocking status

- **WHEN** a gate fails because a return-map or reference-navigation rule is configured as blocking
- **THEN** gate output SHALL name the issue as blocking
- **AND** advice SHALL direct the Agent to the concrete artifact/ref repair path

#### Scenario: Pre-gate inspect ownership does not imply formal Gate ownership

- **WHEN** a section-scoped return-map omission fails `inspect-wave2-output.mjs`
- **AND** the formal Wave2 Gate has no configured return-map rule
- **THEN** the inspect output SHALL name the omission as blocking for that inspect command
- **AND** the change SHALL NOT require the formal Gate output to repeat the return-map rule id or verdict

#### Scenario: blocking inspect finding includes repair coordinates

- **WHEN** an inspect command fails because a deterministic output contract is not satisfied
- **THEN** the finding SHALL name the failing bundle-relative surface and expected shape
- **AND** advice SHALL name the nearest repair surface, such as a seed-topic return-map entry, work-unit result declaration, depth-review ref, finding field, or concrete `reference/*.md` file

#### Scenario: prerequisite failure short-circuits symptoms

- **WHEN** a required structured parent object or artifact cannot be parsed
- **THEN** primary inspect output SHALL report that root cause first
- **AND** checks requiring the missing parent SHALL not emit independent primary failures

#### Scenario: summary fields agree with classifications

- **WHEN** inspect output contains blocking, advisory, and diagnostic-only findings
- **THEN** every `check.failed_rule_ids` entry SHALL appear in `check.finding_classification.blocking`
- **AND** `check.passed` and `checks_failed` SHALL ignore advisory and diagnostic-only findings
