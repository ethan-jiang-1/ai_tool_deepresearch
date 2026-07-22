> req: RUE-001, RUE-002, RUE-004, RUE-005, RUE-006

## Purpose

定义 DPT_FRAMEWORK 入口文件 `RUN.md` 的行为规范：版本标识宣告、内置 research shortcut 覆盖指令、以及关联 agent 行为文件（CLAUDE.md / AGENTS.md / README.md）的同步一致性。
## Requirements
### Requirement: Entry point announces version

The RUN.md entry point SHALL display the framework version as a banner immediately after the title, before any behavioral instructions.

The version banner format SHALL be `> **DPT_FRAMEWORK v<major>.<minor>**`. The concrete version in this banner SHALL match the latest repo-root `CHANGELOG.md` entry as required by `version-management` VEM-003. Historical change-specific target versions SHALL remain in archived proposals/changelog entries, not as a permanent current-version assertion in the accepted requirement.

#### Scenario: Agent reads RUN.md and sees current version

- **WHEN** an Agent reads `DPT_FRAMEWORK/RUN.md`
- **THEN** the first content after the title SHALL be a blockquote banner in the format `DPT_FRAMEWORK v<major>.<minor>`
- **AND** the banner version SHALL equal the latest repo-root `CHANGELOG.md` entry
- **AND** the banner SHALL appear before the trigger-context blockquote and Section 0

### Requirement: Entry point instructs agents not to use built-in research shortcuts

The RUN.md entry point SHALL contain an explicit instruction block that tells the agent to NOT invoke any built-in `deep-research` skill or equivalent research shortcut when the agent's tool list contains such a shortcut.

The instruction SHALL:
- Appear as `## 0. 禁用内置捷径（最高优先）` after the version banner and before the original trigger-context blockquote and "确认引擎" section (Section 1)
- Use conditional-action phrasing (if-then) that directly binds to the agent's tool-calling behavior
- State that reading this file means the DPT_FRAMEWORK entry path has been selected and replaces any built-in research shortcut for this run

#### Scenario: Agent with built-in research shortcut reads RUN.md
- **WHEN** an agent whose tool list includes a `deep-research` skill or equivalent research shortcut reads `DPT_FRAMEWORK/RUN.md`
- **THEN** Section 0 SHALL instruct the agent not to invoke that built-in shortcut
- **AND** Section 0 SHALL instruct the agent to proceed with the DPT_FRAMEWORK flow described in Section 2

#### Scenario: Agent without built-in research shortcut reads RUN.md
- **WHEN** an agent whose tool list does NOT include a `deep-research` skill or equivalent research shortcut reads `DPT_FRAMEWORK/RUN.md`
- **THEN** the Section 0 override instruction is a no-op
- **AND** the DPT_FRAMEWORK flow described in Section 2 remains the next execution path

### Requirement: Agent behavior files stay synchronized on skill override

When the skill-override instruction in RUN.md is updated, the same directive SHALL be reflected consistently across repo-root `CLAUDE.md`, repo-root `AGENTS.md`, `DPT_FRAMEWORK/CLAUDE.md`, `DPT_FRAMEWORK/AGENTS.md`, and `DPT_FRAMEWORK/README.md`.

Repo-root behavior files SHALL contain a short high-priority rule: when the user expresses research, deep-research, investigation, or report intent and this repo's `DPT_FRAMEWORK/` is the selected or relevant entry path, the Agent SHALL NOT invoke built-in `deep-research` or equivalent one-shot research shortcuts. It SHALL use `DPT_FRAMEWORK/RUN.md` and the framework workflow.

#### Scenario: Skill override language consistency
- **WHEN** RUN.md Section 0 instructs agents not to invoke built-in deep-research or equivalent research shortcuts
- **THEN** repo-root `CLAUDE.md` and repo-root `AGENTS.md` SHALL contain equivalent repo-level routing language
- **AND** `DPT_FRAMEWORK/CLAUDE.md` and `DPT_FRAMEWORK/AGENTS.md` SHALL contain equivalent framework-local directive language
- **AND** README.md trigger rules SHALL reference the override instruction

#### Scenario: Root behavior files suppress shortcut before framework-local files
- **WHEN** a fresh Agent session loads repo-root behavior files before reading `DPT_FRAMEWORK/RUN.md`
- **AND** the user expresses research intent with `DPT_FRAMEWORK/` selected or relevant
- **THEN** the root behavior files SHALL instruct the Agent not to call a built-in research shortcut
- **AND** they SHALL route the Agent to the DPT framework entry instead

### Requirement: Entry trigger hands control to Agent-run framework execution

The `RUN.md` entry surface SHALL frame dragging, pasting, or otherwise providing `DPT_FRAMEWORK/RUN.md` as a one-time pre-pipeline trigger that selects the DPT_FRAMEWORK entry path and transfers control to the Agent.

After that user-initiated entry trigger has selected the path, `RUN.md` SHALL direct the Agent to proceed with framework execution rather than asking whether to use DPT_FRAMEWORK, a built-in research shortcut, or another route. The entry trigger SHALL NOT create another framework-initiated clarification/wait point. Research-goal, scope and effort clarification belongs to HITL1; host setup/permission failure remains a narrow external prerequisite boundary rather than a conversational lifecycle checkpoint.

The entry surface and synchronized framework entry docs SHALL present the default collaboration rhythm as:

```text
HITL1: align research goal, scope and effort
  -> non-HITL phases: Agent runs silently and autonomously
  -> HITL2: review current research and decide delivery or further work
  -> Final: terminal delivery only when proceed is selected
```

HITL1 and HITL2 SHALL be the only framework-initiated points where the framework invites and waits for a semantic decision. During the autonomous middle, the framework SHALL NOT initiate progress, ordinary-error, idle, acknowledgement, or continuation messages. A user-initiated normal conversation turn SHALL be answered, but the answer SHALL NOT create a third HITL, permission, mutation/reentry authority, pause/interrupt lifecycle, or promise that arbitrary mid-run intent is persisted or applied. Final SHALL remain terminal delivery rather than a third decision interaction point.

Entry positioning SHALL describe DPT_FRAMEWORK as iterative research that preserves history/provenance while allowing current judgments to be revised, downgraded, or superseded. It SHALL NOT promise unlimited reruns, guarantee every rerun is purely incremental, or claim that all historical conclusions remain currently valid.

#### Scenario: Reading RUN.md means DPT_FRAMEWORK was selected

- **WHEN** the Agent reads `DPT_FRAMEWORK/RUN.md` as the run entry
- **THEN** the entry docs SHALL state that DPT_FRAMEWORK has been selected for this run
- **AND** subsequent command execution SHALL be assigned to the Agent
- **AND** the docs SHALL NOT ask the user to confirm whether to use the framework

#### Scenario: Pre-pipeline exception is explicit

> **@deprecated name** — Retained as the historical scenario anchor. The target behavior removes the former route-clarification exception.

- **WHEN** the user provides or opens `RUN.md` and thereby selects DPT_FRAMEWORK
- **THEN** entry docs SHALL direct the Agent into framework execution without another route-selection question
- **AND** research semantics that still need clarification SHALL be handled at HITL1
- **AND** host setup or permission failure SHALL be reported only as the smallest external prerequisite, not a third lifecycle interaction point

#### Scenario: Entry docs expose the two-HITL rhythm

- **WHEN** an Agent or user reads the framework entry docs
- **THEN** the docs SHALL identify HITL1 and HITL2 as the only framework-initiated in-run decision points
- **AND** they SHALL describe the middle as silently autonomous
- **AND** they SHALL describe Final as terminal delivery rather than another decision loop

#### Scenario: User-initiated message does not add an entry path

- **WHEN** a user voluntarily sends a normal conversation message while a non-HITL phase is active
- **THEN** entry docs SHALL require the Agent to answer that turn
- **AND** they SHALL NOT describe the message as another HITL, entry trigger, mutation permission, pause state, or durable intervention path

#### Scenario: Iterative positioning separates history from current judgment

- **WHEN** entry docs describe rerun or iterative refinement
- **THEN** they SHALL say that historical evidence, provenance, decisions and Gate lineage remain traceable
- **AND** they SHALL allow current conclusions to be revised, downgraded or superseded
- **AND** they SHALL NOT promise unlimited reruns or permanent validity of stale conclusions

### Requirement: Explicit existing bundle card routes before the new-run default

Root and framework-local Agent routing surfaces SHALL distinguish an explicitly
supplied, reachable existing `BUNDLE_MAP.md` from a new research request. When
the user explicitly supplies or opens that map in the selected DPT workspace
and asks to continue, inspect, supplement, or question that bundle, the
routing surface SHALL direct the Agent to the canonical existing-bundle
continuation playbook before `RUN.md` / `start-research`.

This condition SHALL require an explicit user-provided map/bundle and a
reachable containing directory. It SHALL NOT be satisfied by filesystem
scanning, a bare filename, a copied/unreachable map, or a card coordinate that
selects an untrusted framework. In those cases, the Agent retains the direct
framework-context boundary. When the condition is absent, existing `RUN.md`
new-research routing remains unchanged.

The distinction SHALL be synchronized across repo-root `AGENTS.md` and
`CLAUDE.md`, framework `AGENTS.md` and `CLAUDE.md`, and relevant framework
entry/command guidance. It SHALL not add a lifecycle checkpoint, host trigger,
permission, mutation, or rerun authority.

#### Scenario: Explicit existing map prevents second bundle creation

- **WHEN** a user explicitly provides a reachable existing bundle's
  `BUNDLE_MAP.md` in a selected DPT workspace and asks to continue or inspect it
- **THEN** Agent routing SHALL direct to the existing-bundle continuation
  playbook before `start-research`
- **AND** it SHALL not create a new bundle merely because the request has
  research intent

#### Scenario: New research still uses the existing RUN entry

- **WHEN** a user makes a research request without an explicitly supplied,
  reachable existing bundle map
- **THEN** root/framework routing SHALL retain the existing `RUN.md` and
  `start-research` new-run path

#### Scenario: Card is not an automatic host trigger

- **WHEN** a map is discovered by scanning, named without being supplied, or
  cannot establish its reachable bundle/framework context
- **THEN** routing SHALL not select that bundle or execute its continuation
  commands
- **AND** it SHALL not treat attachment wording or map coordinates as host
  trigger, framework authentication, permission, or reentry authority
