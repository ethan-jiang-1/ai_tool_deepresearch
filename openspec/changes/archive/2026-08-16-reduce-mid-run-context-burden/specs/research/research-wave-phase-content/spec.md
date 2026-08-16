## MODIFIED Requirements

### Requirement: Anti-cheating rules in wave phase bodies

Wave phase bodies SHALL forbid claims of delegated evidence, search, or reference production unless the claimed outputs are covered by submitted work-unit ledger rows and pass the relevant gate checks. Anti-cheating examples SHALL point to work-unit submit, output declarations, cache trail validation, and gate verdicts as the corrective path.

Since each wave phase's `requires` includes `shared/shared-anti-cheating-rules`, the wave phase body SHALL NOT verbatim-repeat the shared file's common prohibition sentences in its local anti-cheating section. The local section SHALL keep only wave-specific prohibitions and point to the shared file for the common baseline; the common baseline remains single-sourced in `shared/shared-anti-cheating-rules.md`.

#### Scenario: delegated evidence claim requires work-unit coverage

- **WHEN** a phase artifact claims delegated evidence production
- **AND** no submitted work-unit ledger row covers the evidence
- **THEN** the phase or gate guidance SHALL treat the claim as invalid

#### Scenario: wave local anti-cheating section is single-sourced

- **WHEN** a wave phase body's local anti-cheating section repeats a common
  prohibition sentence that also appears in `shared/shared-anti-cheating-rules.md`
- **THEN** the deterministic workflow consistency check SHALL fail and name the
  wave phase and the repeated sentence
- **AND** the local section SHALL be edited to keep only wave-specific
  prohibitions plus a pointer to the shared file
