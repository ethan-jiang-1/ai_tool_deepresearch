> req: EXA-004, EXA-009

## MODIFIED Requirements

### Requirement: Manifest is the single runnable selection authority

The Autorun Supervisor SHALL select and order active paths from `PLAYBOOK_MANIFEST.md`. Its only machine section SHALL be bounded exactly once by `<!-- agent-experiment-manifest:v1 -->` and `<!-- /agent-experiment-manifest -->` and contain one single-column `Path` Markdown table. Row order SHALL be execution order; each row SHALL contain one repository-relative POSIX playbook path. The manifest SHALL register each active runnable `case-*.md` exactly once and SHALL NOT repeat derived case/group/cost/policy/judge fields or maintain a second JSON/table projection.

Every registered playbook SHALL use a strict/closed `schema: command-experiment/v2` frontmatter with exactly these required fields: non-empty `experiment`, full-stem `case`, non-empty `case_goal`; `verdict_mode: all|last`; unique non-empty stable `required_checks[]`; unique non-empty stable `bundle_roles[]`, one `verdict_role` in that set, and unique non-empty `health_roles[]` as a bundle-role subset containing the verdict role; `health_profile: light|standard|heavy`; unique `durable_evidence_roles[]`; and the verification-aligned profile `proof_subject: deterministic_contract|agent_behavior`, `subject_execution: none|real_agent|real_subagent`, `fixture: none|setup_only|fixture_backed`, `runtime: real_disposable_bundle`, `external_calls: none|real`, `verdict_judge: deterministic|real_human|ai_judge`. Bundle/verdict/health roles SHALL match `^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`; durable evidence roles SHALL match `^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$`. Roles describe authority, never paths. V2 role-array order SHALL be the canonical completion/audit serialization order but SHALL NOT create verdict or health authority from position. `deterministic_contract` SHALL use an empty durable-evidence role list; `agent_behavior` SHALL use the non-empty case-ledger role set. Optional fields SHALL be limited to registered requirement references, a non-empty informational `not_run_if`, `regression_recommendation: recommended`, and `regression_retry_safety: reviewed`. The recommendation defaults to neutral and grants no launch, outcome, health, cost or coverage authority. The retry-safety declaration SHALL be valid only for `verdict_mode: all`; it records a case-level regression admission review but does not alter native verdict semantics. Cross-field constraints SHALL match accepted `verification-routing`. These actor fields describe the Subject Agent/proof claim; they SHALL NOT be inferred from the always-present Headless/Interactive Playbook Agent.

Cost SHALL come from the filename grammar. A co-located `exph_*` 901–949 case SHALL declare real-human judge, and its 950–999 +50 dual SHALL declare AI judge, consistent with accepted band/pair rules. Filesystem discovery across current `exp_*` and `exph_*` runnable locations SHALL be used only to detect unregistered files. An unregistered file or stale, missing, duplicate, identity-mismatched, unsafe, invalid-cost, missing-policy, impossible proof profile or judge-mismatched entry SHALL fail before Agent launch. V1 `weight`, `runner`, `execution`, `evidence`, static `bundle`/`trace`, `verdict`, `agent_mode`, and `agent_dependency` SHALL be retired from current registered playbooks/schema: V2/runtime path identifies the correct dimension, native completion owns dynamic paths/outcome, and `not_run_if` is explanation only.

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

### Requirement: Autorun exposes strategy selection without becoming a controller

The Autorun Supervisor SHALL accept `--run-profile regression` only for Headless selection and SHALL fail closed before credential loading or run-root creation when the request widens the fast envelope: predicted-duration bound greater than `480000` ms, total budget greater than `$3.00`, per-case budget greater than `$0.60`, Agent timeout greater than `120000` ms, or a per-health-target timeout greater than `60000` ms. Because the existing general Agent timeout default is wider, a non-dry regression launch SHALL explicitly supply `--timeout` no greater than `120000` ms; dry-run makes no child launch and does not require that flag. A non-dry regression launch SHALL retain the existing positive total-budget requirement; the Supervisor SHALL impose an effective `$0.60` per-case launch cap even when the caller did not supply a smaller cap. Exact selectors, Interactive mode, and assurance-only scope combinations SHALL remain incompatible with regression. `--regression-qualification` SHALL be the sole explicit opt-in to select `needs_qualification` candidates under the same envelope; it SHALL require `--run-profile regression` and SHALL be rejected with every other profile or exact selector.

The Supervisor SHALL pass only strategy-selected `eligible` regression playbooks into the existing one-Agent-per-case lifecycle, revalidating their current manifest/frontmatter before preparation. A `needs_qualification` or `ineligible` case SHALL appear in dry-run selection feedback but SHALL NOT be launched through normal regression. An empty eligible regression selection SHALL fail before runtime preparation; the Supervisor SHALL NOT silently choose a slow case, launch a qualification candidate, retry a breach, or schedule a later batch.

The Supervisor SHALL keep `480000` ms as the strategy's selection forecast, not as a new global batch deadline or scheduler. It SHALL retain the ordinary sequential lifecycle, native outcome, health, audit, report, and cleanup authorities after selection.

#### Scenario: A widened regression command fails before side effects

- **WHEN** an operator invokes `--run-profile regression` with a `600000` ms predicted-duration bound, `$4.00` total budget, `$1.00` per-case budget, a `180000` ms Agent timeout, or a `90000` ms per-health-target timeout
- **THEN** the Supervisor rejects the request before credentials, run roots, reports, or Agent launch
- **AND** it does not reinterpret the invocation as discovery or a legacy selector

#### Scenario: Non-dry regression cannot inherit the general timeout

- **WHEN** an operator launches regression without an explicit `--timeout`
- **THEN** the Supervisor rejects the invocation before credential loading or run-root creation
- **AND** a regression dry-run remains able to inspect the same selection without that runtime flag

#### Scenario: Qualification candidates are inspectable but not launched as regression

- **WHEN** a dry regression projection finds a fast historical v1 case that still needs matching v2 qualification
- **THEN** dry-run output identifies its qualification reason
- **AND** a non-dry regression invocation does not create a run root for that case

#### Scenario: Explicit qualification retains the fast envelope

- **WHEN** an operator combines `--run-profile regression --regression-qualification` with valid fast bounds
- **THEN** the Supervisor may launch only strategy-selected qualification candidates under the same effective `$0.60` per-case cap
- **AND** the retained selection observation identifies qualification rather than normal regression

#### Scenario: An eligible regression case retains the ordinary lifecycle

- **WHEN** one eligible regression case is selected within the fast envelope
- **THEN** the Supervisor launches one fresh Headless Playbook Agent and records the normal native completion, health, audit, report, and cleanup facts
- **AND** regression selection does not create a new scheduler, verdict, health owner, or repair controller
