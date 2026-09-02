## MODIFIED Requirements

### Requirement: Manifest is the single runnable selection authority

The Autorun Supervisor SHALL select and order active paths from `PLAYBOOK_MANIFEST.md`. Its only machine section SHALL be bounded exactly once by `<!-- agent-experiment-manifest:v1 -->` and `<!-- /agent-experiment-manifest -->` and contain one single-column `Path` Markdown table. Row order SHALL be execution order; each row SHALL contain one repository-relative POSIX playbook path. The manifest SHALL register each active runnable `case-*.md` exactly once and SHALL NOT repeat derived case/group/cost/policy/judge fields or maintain a second JSON/table projection.

Every registered playbook SHALL use a strict/closed `schema: command-experiment/v2` frontmatter with exactly these required fields: non-empty `experiment`, full-stem `case`, non-empty `case_goal`; `verdict_mode: all|last`; unique non-empty stable `required_checks[]`; unique non-empty stable `bundle_roles[]`, one `verdict_role` in that set, and unique non-empty `health_roles[]` as a bundle-role subset containing the verdict role; `health_profile: light|standard|heavy`; unique `durable_evidence_roles[]`; and the verification-aligned profile `proof_subject: deterministic_contract|agent_behavior`, `subject_execution: none|real_agent|real_subagent`, `fixture: none|setup_only|fixture_backed`, `runtime: real_disposable_bundle`, `external_calls: none|real`, `verdict_judge: deterministic|real_human|ai_judge`. Bundle/verdict/health roles SHALL match `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`; durable evidence roles SHALL match `^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$`. Roles describe authority, never paths. V2 role-array order SHALL be the canonical completion/audit serialization order but SHALL NOT create verdict or health authority from position. `deterministic_contract` SHALL use an empty durable-evidence role list; `agent_behavior` SHALL use the non-empty case-ledger role set. Optional fields SHALL be limited to registered requirement references, a non-empty informational `not_run_if`, `regression_recommendation: recommended`, and `regression_retry_safety: reviewed`. The recommendation defaults to neutral and grants no launch, outcome, health, cost or coverage authority. The retry-safety declaration SHALL be valid only for `verdict_mode: all`; it records a case-level regression admission review but does not alter native verdict semantics. Cross-field constraints SHALL match accepted `verification-routing`. These actor fields describe the Subject Agent/proof claim; they SHALL NOT be inferred from the always-present Headless/Interactive Playbook Agent.

Cost SHALL come from the filename grammar. A co-located `exph_*` 901–949 case SHALL declare real-human judge, and its 950–999 +50 dual SHALL declare AI judge, consistent with accepted band/pair rules. Filesystem discovery across current `exp_*` and `exph_*` runnable locations SHALL be used only to detect unregistered files. An unregistered file or stale, missing, duplicate, identity-mismatched, unsafe, invalid-cost, missing-policy, impossible proof profile or judge-mismatched entry SHALL fail before Agent launch. V1 `weight`, `runner`, `execution`, `evidence`, static `bundle`/`trace`, `verdict`, `agent_mode`, and `agent_dependency` SHALL NOT appear in current registered playbooks/schema (retired): V2/runtime path identifies the correct dimension, native completion owns dynamic paths/outcome, and `not_run_if` is explanation only.

Exact legacy selection SHALL preserve manifest order. A Headless invocation SHALL provide an explicit exact selector (`--case`, `--group`, `--tier`, or `--all`) or an explicit Experiment Run Strategy profile; an invocation with neither SHALL fail before run-root creation. `--case` SHALL require one exact full case identity and be exclusive with other exact selectors. `--group` MAY combine with one `--tier`; either alone selects its exact matching autorun-compatible set. `--tier` SHALL remain a compatibility filter over filename cost only: it SHALL NOT assert current duration, coverage priority, proof freshness, or a virtual classification. `--all` SHALL select all autorun-compatible cases but not real-human manual cases. Profile selection SHALL preserve its own reported deterministic order and SHALL use manifest order for ties. Exact Headless selection of a real-human case SHALL report HUMAN without launch and direct the operator to the bounded Interactive path. Empty, ambiguous, unknown or invalid combinations SHALL fail before run-root creation. `--dry-run` SHALL validate and report the exact selection/projection without Agent runtime preflight or filesystem mutation.

#### Scenario: Standard selection does not use weight as cost

- **WHEN** a registered playbook filename has standard cost
- **AND** the user selects `--tier standard`
- **THEN** the case is selected from its manifest/filename cost
- **AND** no frontmatter weight exists to include it in `--tier light`

#### Scenario: Manifest drift blocks launch

- **WHEN** a runnable case file has no exact manifest entry or a manifest path is stale
- **THEN** validation fails with the mismatched case/path
- **AND** the Supervisor does not compensate by scanning and running an inferred set

#### Scenario: No selector fails closed

- **WHEN** an operator supplies no exact selector and no Experiment Run Strategy profile
- **THEN** the Supervisor fails before Agent runtime, run-root creation, or case launch
- **AND** it does not silently select filename-Light cases

#### Scenario: Tier remains a historical compatibility filter

- **WHEN** an operator selects `--tier light`
- **THEN** the Supervisor filters the filename cost label in manifest order
- **AND** its report does not label the selected cases as currently fast, fresh, or comprehensive

#### Scenario: Dry run does not require an Agent runtime

- **WHEN** a valid selection is requested with `--dry-run`
- **THEN** the Supervisor reports exact ordered cases and derived V2 policy
- **AND** it does not create run roots, load credentials, or launch the Agent CLI

