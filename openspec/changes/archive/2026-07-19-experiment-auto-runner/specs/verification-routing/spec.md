# verification-routing

> req: VER-001, VER-006

## MODIFIED Requirements

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

## ADDED Requirements

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
