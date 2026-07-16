> req: RUE-005

## MODIFIED Requirements

### Requirement: Entry trigger hands control to Agent-run framework execution

The `RUN.md` entry surface SHALL frame dragging, pasting, or otherwise providing `DPT_FRAMEWORK/RUN.md` as a one-time pre-pipeline trigger that selects the DPT_FRAMEWORK entry path and transfers control to the Agent.

After that entry path has been selected, `RUN.md` SHALL direct the Agent to proceed with framework execution rather than asking whether to use DPT_FRAMEWORK or a built-in research shortcut. Any routing clarification outside HITL1/HITL2 SHALL be explicitly labeled as a pre-pipeline exception before autonomous lifecycle execution begins, and SHALL NOT appear inside `stop: no` lifecycle phase instructions.

The entry surface and synchronized framework entry docs SHALL present the default collaboration rhythm as:

```text
HITL1: align research goal, scope and effort
  -> non-HITL phases: Agent runs silently and autonomously
  -> HITL2: review current research and decide delivery or further work
  -> Final: terminal delivery only when proceed is selected
```

HITL1 and HITL2 SHALL be the only framework-initiated in-run checkpoints where the framework invites and waits for a semantic decision. During the autonomous middle, the framework SHALL NOT initiate progress, ordinary-error, idle, acknowledgement, or continuation messages. A user-initiated normal conversation turn MAY be answered, but the answer SHALL NOT create a third HITL, permission, mutation/reentry authority, pause/interrupt lifecycle, or promise that arbitrary mid-run intent is persisted or applied. Final SHALL remain terminal delivery rather than a third decision interaction point.

Entry positioning SHALL describe DPT_FRAMEWORK as iterative research that preserves history/provenance while allowing current judgments to be revised, downgraded, or superseded. It SHALL NOT promise unlimited reruns, guarantee every rerun is purely incremental, or claim that all historical conclusions remain currently valid.

#### Scenario: Reading RUN.md means DPT_FRAMEWORK was selected

- **WHEN** the Agent reads `DPT_FRAMEWORK/RUN.md` as the run entry
- **THEN** the entry docs SHALL state that DPT_FRAMEWORK has been selected for this run
- **AND** subsequent command execution SHALL be assigned to the Agent
- **AND** the docs SHALL NOT ask the user to confirm whether to use the framework

#### Scenario: Pre-pipeline exception is explicit

- **WHEN** entry docs include a clarification question before a bundle exists
- **THEN** the question SHALL be labeled as pre-pipeline routing outside autonomous lifecycle execution
- **AND** it SHALL NOT weaken the HITL1/HITL2-only framework-initiated decision boundary

#### Scenario: Entry docs expose the two-HITL rhythm

- **WHEN** an Agent or user reads the framework entry docs
- **THEN** the docs SHALL identify HITL1 and HITL2 as the only framework-initiated in-run decision points
- **AND** they SHALL describe the middle as silently autonomous
- **AND** they SHALL describe Final as terminal delivery rather than another decision loop

#### Scenario: User-initiated message does not add an entry path

- **WHEN** a user voluntarily sends a normal conversation message while a non-HITL phase is active
- **THEN** entry docs MAY permit the Agent to answer that turn
- **AND** they SHALL NOT describe the message as another HITL, entry trigger, mutation permission, pause state, or durable intervention path

#### Scenario: Iterative positioning separates history from current judgment

- **WHEN** entry docs describe rerun or iterative refinement
- **THEN** they SHALL say that historical evidence, provenance, decisions and Gate lineage remain traceable
- **AND** they SHALL allow current conclusions to be revised, downgraded or superseded
- **AND** they SHALL NOT promise unlimited reruns or permanent validity of stale conclusions
