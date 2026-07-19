# Verification Routing

> req: VER-001, VER-002, VER-003, VER-004, VER-005, VER-006

## Purpose

Define the canonical verification taxonomy, claim routing contract, execution-profile semantics, asset checks, and native verdict boundaries for repository changes.
## Requirements
### Requirement: Verification claims SHALL route through one of four test classes

The project SHALL use exactly four canonical test classes. `test_class` is the only normative routing taxonomy:

| Test class | Control surface | Owned boundary | Native verdict authority |
| --- | --- | --- | --- |
| `unit` | JS-led focused test | focused `tests/` assets outside integration and E2E subtrees | `node_test_exit` |
| `integration` | JS-led component-boundary test | `tests/integration/` | `node_test_exit` |
| `deterministic_e2e` | JS-led full-chain state test | `tests/e2e/` | `node_test_exit` |
| `agent_flow_e2e` | Playbook-Agent-executed Markdown playbook | `experiments_playbook/` over one Supervisor-owned disposable case root | `trace_jsonl` through native completion |

This capability uses four distinct roles:

- **Playbook Agent**: the Coding Agent that reads and executes an `agent_flow_e2e` Markdown playbook, Headless under Agent Experiment Autorun or Interactive in bounded manual replay; its participation alone proves no Subject Agent behavior;
- **Subject Agent/Sub-agent**: the system actor whose semantic search, judgment, writing, repair, synthesis, or routing behavior a claim may prove;
- **Autorun Supervisor / Agent CLI Launcher**: deterministic host lifecycle and Agent-runtime launch surfaces, not proof subjects or verdict judges; and
- **JS driver**: the `deterministic_e2e` test process that may simulate labeled Agent-owned actions but cannot become a real Subject Agent.

`regression` is a non-normative grouping term for `unit`, `integration`, and `deterministic_e2e`; it is not a second field to select. Existing accepted prose such as "controlled E2E", "Agent-driven E2E", "Agent-assisted command experiment", or "standard/heavy E2E" refers to `agent_flow_e2e` when the asset is a Playbook-Agent-executed Markdown playbook under `experiments_playbook/`; cost and proof subject do not create additional test classes. New route declarations SHALL use only `test_class` identifiers.

An Agent SHALL choose `test_class` by the first matching rule in this precedence order:

1. If a Playbook Agent executes a Markdown playbook step by step, choose `agent_flow_e2e`, regardless of fixture distance, cost, proof subject, or Headless/Interactive launch path.
2. Otherwise, if a JS driver proves a workflow-scale state chain across multiple production checkpoints or lifecycle transitions, choose `deterministic_e2e`.
3. Otherwise, if the proof invokes a production CLI/subprocess, verifies interaction across separately owned production surfaces such as JS and Markdown, or exercises a bounded runtime-bundle/component boundary, choose `integration`.
4. Otherwise, choose `unit` for a focused in-process module/schema/helper contract. A unit test MAY use test-owned temporary fixture files as inputs or outputs of that one contract; incidental fixture I/O alone does not make it integration.

The declared asset path SHALL follow the chosen class. A preferred directory SHALL NOT override the behavioral rule: split a mixed proof into separate claims/assets when one file would otherwise satisfy multiple class definitions. `tests/e2e/` and `experiments_playbook/` are peers only as E2E test surfaces, not equivalent drivers. A deterministic fixture or JS driver SHALL NOT claim real human participation, Agent search, judgment, writing quality, repair reasoning, or synthesis.

An `agent_flow_e2e` SHALL use a real Playbook Agent to execute the registered Markdown playbook against newly created bundle roots inside one disposable case root and canonical repo-root framework paths. The test class identifies the control surface, not automatically the proof subject. A fixture-backed case MAY prove a `deterministic_contract`; only verdict-affecting independent Subject Agent/Sub-agent actions after the fixture boundary MAY prove `agent_behavior`. Native verdict authority remains strict playbook-owned bundle-root trace checks, exposed through the trace-bound native completion; the Supervisor SHALL not reinterpret arbitrary checks. A normal case uses a fresh `dpt_disp_*` verdict bundle; the narrow production-instantiator exception MAY additionally use a declared fresh case-owned `dpt_rb_*` auxiliary without becoming live-production evidence.

Cleanup is host policy, not test-class or verdict authority. The Playbook Agent SHALL stop after native completion. A clean native PASS SHALL be deleted only when the operator explicitly enables Supervisor PASS cleanup, all V2-required health targets are CLEAN, and durable outside-root audit/evidence succeeds. Otherwise the run root is preserved. FAIL, NOT_RUN, lifecycle ERROR/CANCELLED/HUMAN, health ISSUES/ERROR, and Interactive v1 SHALL not be deleted.

#### Scenario: Cross-phase deterministic claim routes by chain breadth

- **WHEN** a change claims that an Engine CLI filters current-round rows
- **THEN** it SHALL use `test_class: integration` for the focused CLI boundary or `test_class: deterministic_e2e` for the deterministic long chain
- **AND** it SHALL use isolated temporary state and production CLI boundaries
- **AND** it SHALL NOT create a repo-top-level `tests_e2e/` class or claim Agent behavior

#### Scenario: Parser and CLI checker use different classes

- **WHEN** one claim imports and exercises a strict route parser in-process while another invokes its checker CLI against filesystem assets
- **THEN** the parser claim SHALL use `test_class: unit`
- **AND** the checker CLI/asset claim SHALL use `test_class: integration`
- **AND** one test file SHALL NOT be declared as both classes; separate assets SHALL carry the two route identities

#### Scenario: Agent recovery claim routes to agent_flow_e2e

- **WHEN** a real Playbook Agent follows Markdown instructions to write a rerun direction and recover a controlled interruption
- **THEN** the claim SHALL use `test_class: agent_flow_e2e` and a registered `experiments_playbook/` case inside a fresh disposable case root
- **AND** native verdict SHALL come from required strict trace checks through completion
- **AND** only explicit Supervisor cleanup after CLEAN health MAY delete the run root

#### Scenario: Runtime context does not become a test class

- **WHEN** an `agent_flow_e2e` creates and executes against one or more case-owned bundle roots
- **THEN** the test class SHALL remain `agent_flow_e2e`
- **AND** the plan SHALL record `real_disposable_bundle` as an execution-profile fact rather than declaring another class

### Requirement: Each new change SHALL declare a closed verification plan

Each change created after this capability is accepted SHALL contain `verification-plan.yaml` at its change root. It SHALL use `schema_version: verification-routing/v1`, name the owning change, and declare all four canonical test classes as `selected` or `not_applicable` with a non-empty rationale. The plan SHALL use `test_class` as the single route discriminator; grouping or descriptive labels such as `regression`, `controlled_e2e`, `method`, or `scope` SHALL NOT be stored as a second route field.

The v1 state model SHALL obey these invariants:

- every claim references exactly one `test_class` whose status is `selected`;
- every `selected` test class has at least one claim;
- `not_applicable` test classes have no claims;
- every claim has exactly one asset path; when multiple claims reference the same path, their `test_class`, `proof_subject`, `asset.kind`, `execution_profile`, and `verdict_authority` SHALL be identical so one file cannot carry conflicting route identities;
- every claim has a unique kebab-case id, a non-empty statement of the proof obligation, one test class, a class-compatible asset kind, an execution profile, and the class's exact native verdict authority;
- `unit`, `integration`, and `deterministic_e2e` require `asset.kind: node_test`; `agent_flow_e2e` requires `asset.kind: markdown_playbook`;
- every claim declares `proof_subject: deterministic_contract | agent_behavior`; `unit`, `integration`, and `deterministic_e2e` require `deterministic_contract`, while `agent_flow_e2e` permits either value;
- `execution_profile.fixture` is `none`, `setup_only`, or `fixture_backed` and records substitution for an upstream production, subject-Agent, or human-produced fact. Direct arguments/documents intrinsic to the contract under test and incidental test-owned temporary files do not by themselves create fixture distance. `setup_only` may establish preconditions but SHALL NOT produce any subject-Agent-attributed pass fact; `fixture_backed` means a claimed deterministic boundary consumes substituted upstream facts;
- `execution_profile.subject_execution` is `none`, `simulated_agent_actions`, `real_agent`, or `real_subagent`; it records how subject-Agent semantic work contributes to the verdict, not the coding-Agent runner. `proof_subject: agent_behavior` requires `real_agent | real_subagent`, while `simulated_agent_actions` can support only `deterministic_contract`;
- `execution_profile.runtime` is `none`, `temporary_bundle`, or `real_disposable_bundle` and describes active run-bundle context only. A fixture repository or ordinary temporary file tree is not a runtime bundle. `agent_flow_e2e` requires `real_disposable_bundle`, while JS-led classes SHALL NOT use that runtime value as proof of Agent behavior;
- `execution_profile.external_calls` is `none` or `real`, and its value describes execution distance rather than creating a test class;
- `execution_profile.verdict_judge` is `deterministic`, `real_human`, or `ai_judge` and records who supplies any semantic judgment needed for the verdict. `ai_judge` SHALL NOT be reported as real-human evidence, and `real_human` cases remain manual rather than auto-runnable.

Class/profile combinations SHALL obey:

- `unit`: `proof_subject: deterministic_contract`, `subject_execution: none`, `runtime: none`, `external_calls: none`, `verdict_judge: deterministic`, and `fixture: none | fixture_backed`;
- `integration`: `proof_subject: deterministic_contract`, `subject_execution: none`, `runtime: none | temporary_bundle`, `external_calls: none`, `verdict_judge: deterministic`, and `fixture: none | fixture_backed`;
- `deterministic_e2e`: `proof_subject: deterministic_contract`, `subject_execution: none | simulated_agent_actions`, `runtime: temporary_bundle`, `external_calls: none`, `verdict_judge: deterministic`, and `fixture: none | fixture_backed`;
- `agent_flow_e2e` with `proof_subject: deterministic_contract`: `subject_execution: none | real_agent | real_subagent`, `runtime: real_disposable_bundle`, `external_calls: none | real`, `verdict_judge: deterministic`, and `fixture: none | setup_only | fixture_backed`. Real subject execution MAY occur, but the claim SHALL remain limited to the deterministic contract;
- `agent_flow_e2e` with `proof_subject: agent_behavior`: `subject_execution: real_agent | real_subagent`, `runtime: real_disposable_bundle`, `external_calls: none | real`, `verdict_judge: deterministic | real_human | ai_judge`, and `fixture: none | setup_only`.

Existing `exph_*` playbooks remain `agent_flow_e2e`. For a 901-949 real-human case the plan SHALL use `verdict_judge: real_human`; for its 950-999 AI-judge dual it SHALL use `verdict_judge: ai_judge`. The pair MAY share the same `proof_subject` and subject execution, but their claims SHALL NOT share one evidence interpretation or be reported as interchangeable.

A selected claim with `verdict_judge: real_human` is acceptance-critical manual work. It remains incomplete until the real-human verdict is recorded through the case's accepted evidence surface. Route validation, an AI-judge dual, `NOT RUN`, or a coding-Agent summary SHALL NOT complete it.

#### Scenario: Human and AI judge duals remain distinguishable

- **WHEN** two `agent_flow_e2e` playbooks exercise the same real subject-Agent behavior but one uses a real-human reviewer and the other uses an AI judge
- **THEN** their plans SHALL declare `verdict_judge: real_human` and `verdict_judge: ai_judge` respectively
- **AND** AI-judge PASS SHALL NOT satisfy a claim that explicitly requires real-human judgment

#### Scenario: Selected real-human judgment remains incomplete until accepted

- **WHEN** a selected `agent_flow_e2e` claim declares `verdict_judge: real_human`
- **THEN** the claim SHALL remain incomplete until a real human records an accepted verdict through the playbook's native evidence surface
- **AND** route validation, `NOT RUN`, an AI-judge result, or a coding-Agent report SHALL NOT be treated as completion evidence

`verification-plan.yaml` is the direct Source of Record for route selection only. Its schema SHALL be strict and SHALL reject redundant `method`, `scope`, or generic `class` fields as well as result-bearing or unknown fields such as `passed`, `result`, receipt, trace event, execution status, or mutable runtime data. `test_class` answers how and where the test runs; `proof_subject` answers what its PASS is allowed to prove. It SHALL NOT synthesize execution evidence or replace the native authority named by the selected test class.

#### Scenario: An unused test class is explicit without inventing deferred evidence

- **WHEN** a change has no `agent_flow_e2e` claim
- **THEN** its plan SHALL mark `agent_flow_e2e` as `not_applicable` with a rationale and no claims
- **AND** it SHALL NOT use a `deferred` status or fabricate a placeholder claim

#### Scenario: A plan distinguishes fixture distance from Agent proof

- **WHEN** a verification asset preloads state to reach an Engine checkpoint
- **THEN** a deterministic claim consuming that state SHALL use `fixture_backed` with `proof_subject: deterministic_contract`
- **AND** an `agent_flow_e2e` Agent-behavior claim MAY use `setup_only` only when the fixture establishes preconditions and every subject-Agent-attributed pass fact is produced by the real subject Agent after that boundary
- **AND** that claim SHALL name a real-Agent playbook, `real_disposable_bundle` runtime, and trace verdict

#### Scenario: Fixture-backed playbook remains E2E without proving Agent behavior

- **WHEN** a coding Agent executes a standard Markdown playbook over a real disposable bundle but verdict-affecting subject-Agent outputs are fixture-backed
- **THEN** the claim SHALL use `test_class: agent_flow_e2e` and `proof_subject: deterministic_contract`
- **AND** it SHALL declare `subject_execution: none` because no real subject-Agent work contributes to the verdict
- **AND** its PASS SHALL NOT be reported as proof of real Agent or sub-agent behavior

### Requirement: Verification routing SHALL be checked without becoming a runner

The project SHALL provide:

- a strict Zod contract for `verification-routing/v1`, using cross-field refinement for the test-class/claim/asset/verdict invariants; and
- `node openspec/governance/check-verification-routing.mjs --change <name> --mode plan|assets`.

`--mode plan` SHALL parse the plan and validate exact schema version, safe kebab-case change identity, equality between the CLI change name and plan owner, exact four-test-class coverage, the closed status model, claim uniqueness, claim-to-class compatibility, lexical repository-relative asset boundaries, execution-profile declarations, and exact native verdict mappings.

`--mode assets` SHALL repeat plan validation and additionally require selected repository assets to exist as regular files within the normalized repository boundary. It SHALL reject absolute paths, traversal, normalized-root escape, and realpath/symlink escape. `unit` assets SHALL be `.test.mjs` files under `tests/` but outside `tests/integration/` and `tests/e2e/`; `integration` assets SHALL be under `tests/integration/`; `deterministic_e2e` assets SHALL be under `tests/e2e/`. `agent_flow_e2e` assets SHALL be `case-*.md` files under `experiments_playbook/`, pass the canonical playbook frontmatter validator, have a globally unique case identity among runnable files, and have one exact entry in the active runner manifest.

The checker SHALL be read-only. It SHALL NOT execute tests or playbooks, invoke an Agent, infer that declared Agent behavior actually occurred, fabricate trace events, alter a bundle, aggregate PASS/FAIL, or turn a user decision into production mutation authority. Passing `--mode assets` means route and asset registration are valid; only native execution evidence can prove the claim.

Because `verification-plan.yaml` is a repo-specific change artifact rather than a schema-declared OpenSpec artifact, standard `openspec status` and `openspec validate` are not its gate. `openspec/config.yaml` and future change tasks SHALL require plan-mode checking before target edits and asset-mode checking before archive. This bootstrap change MAY first implement only the shared parser/checker and their focused tests; it SHALL then pass plan mode before editing the requirement registry, rerun proof assets, playbooks, config, or knowledge surfaces. This is explicit repo lifecycle discipline, not an overclaim that the OpenSpec CLI enforces the custom artifact automatically.

#### Scenario: Bootstrap checker dogfoods before remaining targets

- **WHEN** this change begins apply before the route checker exists
- **THEN** implementation MAY add only the parser, checker, and focused checker tests needed to make plan mode runnable
- **AND** plan mode SHALL pass before all other target surfaces are edited

#### Scenario: Invalid asset route fails before target edits

- **WHEN** a plan routes an `agent_flow_e2e` claim to a `tests/` fixture, uses its playbook outside `experiments_playbook/`, assigns conflicting route identities to one asset path, or names an unsafe path
- **THEN** plan or asset mode SHALL fail with the claim id, missing fact, authorized correction surface, and the same command to rerun
- **AND** the change SHALL not proceed as if the claim were covered

#### Scenario: Validator does not manufacture a verdict

- **WHEN** a plan and its selected asset registrations are structurally valid
- **THEN** the checker SHALL report only route validity
- **AND** it SHALL NOT report `node_test_exit`, trace, or Agent-behavior PASS before the native evidence path runs

### Requirement: Rerun round continuity SHALL establish the first routed proof set

The initial application of this capability SHALL replace the proposed repo-top-level `tests_e2e/` surface with this routed proof set:

- deterministic direction resolution remains covered by a focused `unit` test;
- current-round `--eligible-rows` filtering and legacy exclusion warnings SHALL be exercised through the actual work-unit inspect CLI under `tests/integration/cli/`, using isolated temporary bundles and no test-local reimplementation of Engine filtering;
- `tests/e2e/rerun-round-continuity.test.mjs` SHALL produce one immutable, test-run-local legal baseline HITL2 source window from production bundle instantiation and real predecessor gates. The happy case SHALL continue from that baseline through HITL2 -> phase-rerun -> seed-topics -> wave0 -> wave1 -> wave2 -> HITL2; before each serialized independent fault case, the harness MAY restore a byte snapshot to the same original active bundle path before injecting one variation and running the affected real suffix. It SHALL NOT copy the baseline to another runtime path or rewrite absolute work-unit/beacon bindings. The suite SHALL NOT commit/cache the baseline across test runs or hand-write a predecessor gate attempt to start at HITL2. A JS driver SHALL simulate Markdown/Agent-owned writes and explicitly labeled actor candidate files, while real production CLIs own their acceptance, submitted status, declaration ledger effects, gate attempts, transitions, status synchronization, trace, and fail-closed behavior;
- writing a current rerun direction and recovering the controlled direction/profile interruption SHALL be covered by the selected heavy real-Agent rerun playbook under `experiments_playbook/exp_wfn_rerun/`, using a fresh disposable bundle, real Agent execution, and a trace-backed verdict;
- the real disposable bundle used by the `agent_flow_e2e` case SHALL remain its runtime context, with clean PASS cleanup and failure/health-issue preservation; it SHALL NOT be represented as another test class.

The missing playbook referenced by the predecessor change SHALL NOT count as evidence merely because its task is checked. The replacement heavy real-Agent rerun playbook, exact runner registration, actual execution, and native trace verdict SHALL exist before the `proof_subject: agent_behavior` claim is reported as covered.

The backlog's per-row projection-authority scenario SHALL remain outside this change. No accepted Engine/CLI currently compares each eligible work id with projection/disposition entries, and this change SHALL NOT reproduce that behavior inside a test. A future behavior change MAY define that deterministic contract and route its proof through `unit`, `integration`, or `deterministic_e2e` according to the canonical precedence rules.

#### Scenario: Integration scenario does not self-implement eligible-row logic

- **WHEN** the rerun `integration` scenario verifies current-round eligible rows
- **THEN** it SHALL invoke `operate-work-unit inspect --eligible-rows` and assert structured output and warnings
- **AND** it SHALL NOT pass solely by reading the index and reproducing the filter in test code

#### Scenario: Deterministic full-chain E2E simulates MD actions without fabricating Engine authority

- **WHEN** the `tests/e2e/` rerun chain advances through phase boundaries or injects a malformed, missing, stale, future/crash-window, or partial Agent-owned artifact
- **THEN** its initial immutable baseline SHALL be produced during that test run through real predecessor gate, handoff, and status paths rather than a test-authored gate attempt or committed fixture
- **AND** each serialized scenario SHALL continue after byte restoration to the original baseline path without sharing prior scenario mutations or rewriting absolute runtime bindings
- **AND** the JS driver MAY write that explicitly labeled Agent/human-owned Markdown/YAML/artifact fixture input
- **AND** candidate actor result/receipt/output fixtures SHALL gain no authority until accepted by real production work-unit submit paths
- **AND** every gate attempt, transition, status change, submitted work-unit state, declaration ledger effect, trace event, rejection, and recovery verdict SHALL come from the real production CLI/Engine path
- **AND** checkpoints expected to fail SHALL preserve the latest legal state and expose one actionable root cause before the same checkpoint is rerun

#### Scenario: agent_flow_e2e rerun playbook is a real runnable asset

- **WHEN** the selected heavy real-Agent rerun playbook is added
- **THEN** it SHALL use a valid role-mapped case path, valid frontmatter, a disposable-bundle setup, an explicit real-Agent dependency, `setup_only` fixture distance, `real_disposable_bundle` execution profile, Reality Distance Ledger, trace checks, conditional cleanup, and one active runner-manifest entry
- **AND** a README, scripted filesystem projection, or unexecuted file alone SHALL NOT satisfy the claim

#### Scenario: Deferred per-row authority work is not faked in a JS-led class

- **WHEN** apply reaches the backlog's per-row projection-authority scenario
- **THEN** implementation evidence SHALL record that the required Engine contract is absent and outside this change
- **AND** no test-local filter or matcher SHALL be presented as production CLI proof

### Requirement: The test-class taxonomy SHALL have one canonical definition that other surfaces reference

After archive, the complete test-class taxonomy and route semantics SHALL have exactly one canonical authority: the `verification-routing` main spec. The classes are `unit`, `integration`, `deterministic_e2e`, and `agent_flow_e2e`. Other accepted specs and knowledge surfaces MAY name those identifiers and state only the asset boundaries they own; they SHALL reference `verification-routing` rather than independently defining classification precedence, proof permissions, plan fields, or checker behavior. Grouping terms, historical prose labels, cost labels, proof subjects, actor types, and execution-profile values SHALL NOT be presented as peer test classes. Ordinal prose names such as "第一层/第二层/第三层" or "Layer 1-4" SHALL NOT be introduced as competing identifiers.

Knowledge surfaces that teach future Agents about verification SHALL state only the asset-ownership boundary facts they own and a pointer to `verification-routing` for routing semantics. They SHALL NOT restate the claim-permission table, plan schema, status invariants, or checker behavior.

A narrow static `integration` contract SHALL guard the high-frequency knowledge surfaces updated by this change. It SHALL verify canonical identifiers, owned directory/spec pointers, retirement of competing ordinal or regression-only/controlled/real-environment taxonomies, and consistent experiment cost summaries. It SHALL NOT duplicate or independently interpret the route matrix, plan schema, or checker semantics.

#### Scenario: A knowledge surface stays a pointer, not a copy

- **WHEN** `openspec/config.yaml`, `openspec/governance/req-registry.yaml`, `AGENTS.md`, `CLAUDE.md`, or verification README files describe project verification after this change applies
- **THEN** they SHALL name the four canonical test classes and owned asset boundaries
- **AND** they SHALL reference `verification-routing` instead of copying its route contract

#### Scenario: Ordinal layer language does not survive as an identifier

- **WHEN** an updated governance or guidance surface classifies a test
- **THEN** it SHALL use one canonical `test_class` identifier
- **AND** ordinal or ad-hoc labels SHALL NOT be introduced as new class names

#### Scenario: Knowledge-surface convergence has an executable guard

- **WHEN** a high-frequency verification entry surface or experiment cost summary drifts after this change
- **THEN** the selected static `integration` contract SHALL fail on the competing identifier, missing canonical pointer, or contradictory cost definition
- **AND** the contract SHALL direct repair to that owned document rather than becoming a second routing authority

### Requirement: Agent-flow routing distinguishes host supervision from Agent actors

For `agent_flow_e2e`, **Playbook Agent** SHALL be the precise execution-role term for the Coding Agent that reads and executes the Markdown playbook. A Playbook Agent MAY be **Headless** when launched through Agent Experiment Autorun or **Interactive** during manual debug/replay; both remain coding-Agent execution under the existing `agent_flow_e2e` test class.

The deterministic **Autorun Supervisor** and **Agent CLI Launcher** are host/lifecycle surfaces, not coding Agents, Subject Agents, verdict judges, or new test classes. A **Subject Agent/Sub-agent** remains the separate actor whose semantic behavior a claim may prove. Launching a Playbook Agent does not by itself prove Subject Agent behavior.

Ordinary CI/node:test without a real Agent runtime SHALL NOT satisfy an `agent_flow_e2e` execution claim. A CI host MAY invoke the Autorun Supervisor only when it supplies a real Agent CLI, model credentials, and required tool capabilities; the test class, proof subject, execution profile, and native verdict authority remain those of the executed Markdown playbook. A deterministic fixture executable MAY prove only unit/integration Supervisor mechanics.

An `agent_flow_e2e` deterministic-contract case MAY exercise the real production instantiator only when its active verdict authority remains a fresh `dpt_disp_*` bundle and the newly created `dpt_rb_*` is an explicitly declared case-owned subject/auxiliary under the same disposable case root. That auxiliary SHALL NOT be a pre-existing or separately selected live run, SHALL be health-checked, and SHALL NOT authorize a live-production evidence claim.

#### Scenario: Headless launch remains agent_flow_e2e

- **WHEN** an Autorun Supervisor launches a real Headless Playbook Agent that executes a Markdown case over a fresh disposable bundle
- **THEN** the case remains `test_class: agent_flow_e2e`
- **AND** the Supervisor does not create a fifth test class or become the proof subject

#### Scenario: CI fixture cannot prove Playbook Agent execution

- **WHEN** an integration test uses a test-owned Claude executable fixture to inspect Supervisor argv, env, timeout, paths, reports, or cleanup
- **THEN** the claim remains a deterministic integration contract
- **AND** it does not prove that a real Headless Playbook Agent followed Markdown or that a Subject Agent performed semantic work

#### Scenario: Playbook Agent and Subject Agent remain distinct

- **WHEN** a Heavy playbook requires a Subject Agent/Sub-agent after setup
- **THEN** Headless Playbook Agent participation alone does not satisfy that subject execution
- **AND** PASS requires the case's declared real subject evidence and native verdict authority

#### Scenario: Production-shaped auxiliary remains disposable experiment evidence

- **WHEN** a deterministic Agent-flow case invokes the real production instantiator under its Supervisor-owned case root
- **THEN** its fresh disposable verdict bundle remains native authority and the fresh production-shaped auxiliary is declared separately
- **AND** neither the runtime profile nor report relabels that bounded experiment as live-production proof
