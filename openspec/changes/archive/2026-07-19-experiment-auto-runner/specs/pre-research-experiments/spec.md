# pre-research-experiments

> req: PRE-001, PRE-002, PRE-003, PRE-004, PRE-005, PRE-006, PRE-007, PRE-008

## RENAMED Requirements

- FROM: `### Requirement: Complex review-surface stays light by using fixed interpretation sample`
- TO: `### Requirement: Fixed interpretation review surface remains deterministic and repeatable`

- FROM: `### Requirement: Workflow-foundation manual HITL review playbook`
- TO: `### Requirement: Current HITL review case supports explicit Headless auto and Interactive manual execution`

- FROM: `### Requirement: Heavy means human-interactive/manual for HITL review`
- TO: `### Requirement: Heavy HITL review cost does not imply a Subject Sub-agent`

## MODIFIED Requirements

### Requirement: Workflow-foundation happy-path pre-research playbook

The current manifest-registered happy-path pre-research playbook SHALL use `command-experiment/v2`, create a real context-contained bundle, expose its fixed HITL payload in Markdown, run current framework validation/inspection and real pre-research gates, convert every verdict-affecting runtime assertion into root-trace checks, and finish through native completion. It SHALL stop before health and cleanup; the Supervisor owns both.

#### Scenario: Happy path completes through native authority

- **WHEN** the fixed HITL payload satisfies the current pre-research contract
- **THEN** the playbook's real gates and trace checks produce native PASS completion
- **AND** no stale `_trace.jsonl`, console verdict, or playbook cleanup becomes authority

#### Scenario: Happy path playbook passes all three pre-research gates

- **WHEN** the fixed HITL1 payload satisfies the current contract
- **THEN** the playbook records the required pre-research gate checks in the root trace and reaches native PASS
- **AND** Supervisor health and cleanup run only after that native completion

### Requirement: Workflow-foundation repair-loop playbook

The current repair-loop role SHALL keep gate failure, Engine inspect/advice feedback, Agent-visible repair, rerun of the same gate, and before/after runtime evidence visible in Markdown. The declared repair SHALL close every direct blocker surfaced by that real gate; for the current HITL1 role, this includes the fixture-backed profile decision, canonical Topic state through its owning operation, and Engine-owned status binding when the gate reports them. Its V2 `verdict_mode` SHALL be `last`; the finalizer SHALL apply that policy rather than an outer runner re-evaluating every historical failed check.

#### Scenario: Repair loop preserves final-per-gate semantics

- **WHEN** a gate fails, the Playbook Agent consumes feedback, applies every declared direct repair through its owning surface, and the same gate passes
- **THEN** native completion records `last` mode and the final considered check set
- **AND** the Supervisor does not reinterpret the earlier expected repair failure as native FAIL

#### Scenario: Repair loop is trace-backed

- **WHEN** the repair-loop playbook executes
- **THEN** the root trace records the expected failed and passing gate checks
- **AND** the native finalizer derives its verdict from that trace under declared `last` semantics

### Requirement: Workflow-foundation review-surface playbook

The current review-surface role SHALL expose the HITL1 question surface, fixed interpretation sample and review checklist directly in Markdown. Its V2 proof profile SHALL honestly declare deterministic/fixture-backed evidence with no Subject Agent when no real semantic actor is run.

#### Scenario: Fixed review sample does not claim Agent behavior

- **WHEN** the Headless or Interactive Playbook Agent executes the fixed review-surface case
- **THEN** the case may prove the deterministic review/gate contract
- **AND** its proof profile and report do not claim live Subject Agent interpretation quality

#### Scenario: Review surface remains visible in Markdown

- **WHEN** a reviewer opens the current review-surface playbook
- **THEN** it can inspect the HITL1 question surface, fixed interpretation sample, and review checklist in Markdown
- **AND** those review materials are not hidden in a JS controller

### Requirement: Fixed interpretation review surface remains deterministic and repeatable

The fixed interpretation review role SHALL remain repeatable without requiring live Subject Agent generation. Filename cost and frontmatter health profile SHALL describe their independent execution and observability dimensions; retired `weight` SHALL NOT classify it.

#### Scenario: Repeatable review uses direct policy facts

- **WHEN** the fixed review case is selected
- **THEN** selection cost comes from its filename and health comes from V2 frontmatter
- **AND** neither fact invents live Agent behavior

#### Scenario: Complex playbook does not require live AI generation

- **WHEN** the fixed review-surface playbook runs
- **THEN** it uses its declared deterministic interpretation sample without requiring live Subject Agent generation
- **AND** its result does not overclaim semantic Agent behavior

### Requirement: Current HITL review case supports explicit Headless auto and Interactive manual execution

The current HITL payload-enumeration/review role SHALL be registered exactly once in `PLAYBOOK_MANIFEST.md` with Heavy filename cost and explicit V2 native/proof policy.

In Agent Autorun, the Headless Playbook Agent SHALL use the case's explicit auto branch and SHALL NOT wait for a human or claim real-human judgment. In deliberate single-case replay, the host SHALL create the same run context and launch an Interactive Playbook Agent with `RUN_INTERACTIVE_EXPS.md`; the Agent MAY pause at the named human payload boundary before continuing through the same real gates and native completion contract.

#### Scenario: Autorun uses the auto branch without human overclaim

- **WHEN** the Autorun Supervisor selects the current HITL review role
- **THEN** a Headless Playbook Agent executes its auto vectors without waiting for a human
- **AND** the resulting evidence is not labeled real-human judgment

#### Scenario: Interactive replay uses one host-created case context

- **WHEN** a user explicitly launches the current HITL review role for Interactive replay
- **THEN** the host creates one validated case run context and injects `RUN_INTERACTIVE_EXPS.md`
- **AND** after the human action the Interactive Playbook Agent resumes the same gates and native completion while host-side health/cleanup remains separate

#### Scenario: Manual HITL playbook is executable but not default light

- **WHEN** an operator selects the manual HITL review role for Interactive replay
- **THEN** it is executable as one explicit Heavy-cost case with its human boundary visible
- **AND** it is not selected as an implicit default light batch case

### Requirement: Heavy HITL review cost does not imply a Subject Sub-agent

Heavy filename cost SHALL communicate expensive/manual-capable review; separate V2 `health_profile` SHALL select bundle observability, and V2 proof fields SHALL say whether a Subject Agent actually runs. No field SHALL infer another.

#### Scenario: Heavy review has no invented Subject Agent proof

- **WHEN** the current HITL review role completes its auto vector path without a Subject Agent/Sub-agent
- **THEN** its native completion may prove the declared deterministic gate matrix
- **AND** the report does not claim real Subject Agent or real-human behavior

#### Scenario: Heavy manual path is not subagent-dependent

- **WHEN** the Heavy HITL review role is selected for Headless auto or Interactive manual execution
- **THEN** its gate path does not require a Subject Sub-agent unless its explicit V2 proof profile declares one
- **AND** Heavy cost does not itself claim Subject Agent behavior

### Requirement: Experiment review surface remains Markdown-first

All workflow-foundation pre-research playbooks SHALL keep case goal, fixed/manual payload, human review points, actor boundaries, and Engine feedback/repair decisions visible in Markdown. Thin JS helpers MAY implement deterministic checkpoints and finalization but SHALL NOT become hidden multi-stage Playbook Agents.

#### Scenario: Reviewer understands the case without reading helper internals

- **WHEN** a reviewer reads the selected playbook body and V2 proof profile
- **THEN** the claim, actor, fixture distance, expected runtime facts and native verdict boundary are understandable
- **AND** helper source is not required to discover the Agent Flow

#### Scenario: Human can review experiment intent without reading JS

- **WHEN** a human reviews a current pre-research experiment playbook
- **THEN** the intended claim, inputs, review boundaries, and decisive Engine feedback are visible in Markdown
- **AND** JS helper internals are not required to understand the experiment intent

### Requirement: Topic rewrite playbook

The current topic-rewrite proof roles SHALL use real context-contained bundles and keep original input, Subject Agent requirement (when claimed), structured rewritten topic, derived seed topics and human/AI review boundary visible in Markdown. Structural gates SHALL remain deterministic and SHALL NOT masquerade as semantic rewrite-quality judges. Runtime paths SHALL come from native completion, not frontmatter globs, and host-side health/cleanup SHALL occur only after completion.

#### Scenario: Topic rewrite distinguishes structure from semantic judgment

- **WHEN** a topic-rewrite role reaches native completion
- **THEN** structural artifacts/gates and any semantic judge provenance are separately auditable
- **AND** a deterministic gate pass alone does not claim good rewrite quality or real-human judgment

#### Scenario: Topic rewrite produces verifiable artifacts

- **WHEN** a current topic-rewrite role completes
- **THEN** its original input, rewritten-topic structure, derived seed topics, and declared semantic-actor provenance are auditable from the run context and native completion
- **AND** structural verification does not substitute for semantic judgment
