# CLI Inspect Output Conventions (delta)

> req: IOC-001, IOC-002, IOC-003, IOC-004, IOC-005
> delta: IOC-005

## MODIFIED Requirements

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
