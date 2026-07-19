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

For section-scoped seed projection findings, classification SHALL be based on the target wave section and current command only. A valid entry, concrete ref, token, or finding in another wave section SHALL NOT change the classification of the current target section. Current-round per-row/per-finding authority omissions are blocking; accepted legacy finding omissions remain advisory.

For blocking deterministic findings, inspect SHALL name the failing artifact/ref/field or rule, expected deterministic shape/canonical value, and one nearest repair surface. When a prerequisite failure makes downstream checks non-actionable, primary `inspect[]` SHALL contain the prerequisite root and SHALL mask, omit, or group dependent symptoms outside the primary repair list.

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

#### Scenario: Legacy Wave2 omission remains advisory

- **WHEN** a legacy Wave2 finding has no target-section projection reference
- **AND** the finding has no current-round marker
- **THEN** inspect SHALL classify the omission as `advisory`
- **AND** `check.passed` SHALL remain unaffected by that finding
- **AND** the advisory SHALL not appear in `check.failed_rule_ids`

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
