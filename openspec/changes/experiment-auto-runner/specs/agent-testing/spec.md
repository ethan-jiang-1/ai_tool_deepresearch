# agent-testing

> req: AGT-005, AGT-006, AGT-007

## REMOVED Requirements

### Requirement: Playbook frontmatter weight field

**Reason**: `weight` duplicates the cost already encoded by the required filename grammar, has drifted between `light` and `standard`, and has no remaining consumer after Agent Autorun selects registered paths from `PLAYBOOK_MANIFEST.md` and filters cost from filenames. Keeping it would create a third cost truth. The constant `runner: coding-agent` frontmatter field is retired in the same migration because it has no independent consumer and conflicts with the precise Headless/Interactive Playbook Agent vocabulary.

**Migration**: Replace current frontmatter with strict `command-experiment/v2`; remove `weight`, `runner`, `execution`, `evidence`, static path globs `bundle`/`trace`, the old verdict-selector field, `agent_mode`, and `agent_dependency` from current playbooks/schema/consumers. Register/order paths in the manifest; derive cost from filename and Playbook Agent role from execution path. V2 native policy SHALL instead carry stable path-free `bundle_roles[]`, `verdict_role` and `health_roles[]` together with verdict mode/check/health policy; durable-evidence roles and accepted proof/subject/fixture/runtime/external/judge fields SHALL NOT reuse `weight`. Optional `not_run_if` is explanation only. Deterministic-contract cases declare no Subject evidence roles; Agent-behavior cases use the checked case-ledger minima. Mark AGT-005 deprecated rather than reusing it.

#### Scenario: Standard cost has one direct source

- **WHEN** a current playbook is named `case-<id>-standard-<role>.md` and registered in the manifest
- **THEN** Agent Autorun classifies it as standard from the filename
- **AND** no frontmatter weight can reclassify it as light

#### Scenario: Playbook Agent identity is not repeated in every case

- **WHEN** a manifest case is executed through Agent Autorun or Interactive replay
- **THEN** the execution path identifies the Headless or Interactive Playbook Agent
- **AND** the playbook does not need `runner: coding-agent` metadata

## RENAMED Requirements

- FROM: `### Requirement: Disposable bundle names include random suffix (AGT-006)`
- TO: `### Requirement: Disposable experiment bundles are collision-resistant and host-cleaned`

- FROM: `### Requirement: Unified trace file naming (AGT-007)`
- TO: `### Requirement: Command experiment bundles use one runtime trace`

## MODIFIED Requirements

### Requirement: Disposable experiment bundles are collision-resistant and host-cleaned

Disposable bundle creation SHALL continue to assign collision-resistant names for repeated same-case runs. During Agent Experiment execution, the approved disposable, production-instantiate and fixture-case creators SHALL place every bundle as a direct child of the validated Supervisor-owned case run root. Outside a valid Agent Experiment context, their accepted ordinary repo/test target behavior SHALL remain available.

Current playbooks SHALL NOT own PASS cleanup, delete by glob, or remove individual bundle paths. For Headless Autorun, the Supervisor SHALL delete only the complete containment-valid case run root after effective PASS, required health CLEAN, explicit cleanup policy, durable transcript and full audit. Interactive replay SHALL use the same host-created run context and post-completion validation/health/audit contract but SHALL preserve its run root in v1.

#### Scenario: Same case reruns do not collide inside run roots

- **WHEN** the same registered case runs more than once
- **THEN** each execution has a unique Supervisor-owned run root and collision-resistant bundle name
- **AND** neither execution reuses or deletes the other's path

#### Scenario: Glob cleanup is retired

- **WHEN** an autorun-compatible playbook reaches native completion
- **THEN** it stops before `rm -rf` or a playbook cleanup helper
- **AND** only the Supervisor may later remove the complete current run root

### Requirement: Command experiment bundles use one runtime trace

Every current command experiment bundle SHALL continue to use bundle-root `rb_trace.jsonl` as the only verdict trace sink. V2 playbook frontmatter SHALL NOT repeat a static `trace:` glob or `bundle:` glob: runtime bundle and trace paths SHALL be declared and byte-bound by native completion under the current run root.

#### Scenario: Runtime trace path comes from completion

- **WHEN** a registered playbook completes with one or more bundles
- **THEN** each declared bundle uses its root `rb_trace.jsonl` surface or explicitly records an auxiliary invalid/missing trace fault
- **AND** no stale frontmatter glob becomes runtime or cleanup authority
