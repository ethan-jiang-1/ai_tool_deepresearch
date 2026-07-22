## ADDED Requirements

> req: URC-001, URC-002, URC-003

### Requirement: Optional user research controls have one durable run snapshot

HITL1 SHALL preserve optional user research controls in the active bundle's `rb_plan.md## Constraints > ### User Research Controls`; this host-file subsection is the sole durable narrative authority for the per-run control brief. The control brief MAY state priorities, exclusions, source/evidence policy, analytical lens, delivery needs, or user context. It SHALL have exactly these compatibility meanings:

- a new bundle with no supplied controls records exactly `未提供额外的本轮研究控制；按已确认的问题、范围和研究 profile 执行。`;
- a new bundle with controls records exactly the label `用户提供的本轮研究控制快照（仅作研究指导，不覆盖 Engine contracts）：` followed by one faithful literal snapshot;
- a legacy bundle without the subsection remains valid and means no additional controls.

The snapshot SHALL remain readable to Agent and user, SHALL NOT become a profile enum, Gate input, lifecycle field, external path, cross-run memory, or machine-scored semantic schema.

Only the exact supplied-controls label followed by a complete deterministic literal snapshot region SHALL mean controls are present to Engine-facing host-file helpers. A legacy same-named subsection, an incomplete fence, or other Constraints prose SHALL remain ordinary narrative content rather than an inferred control state.

#### Scenario: no additional controls use the normal path
- **WHEN** the user supplies no extra research controls at HITL1
- **THEN** HITL1 records the explicit no-controls form in the dedicated subsection
- **AND** Seed, Wave, and Final use the existing question/profile path without a new Gate requirement

#### Scenario: legacy bundle remains compatible
- **WHEN** a valid legacy `rb_plan.md` has no `User Research Controls` subsection
- **THEN** later phases treat it as no additional controls
- **AND** no migration, failure, or inferred user preference is created

### Requirement: Controls guide Agent judgment inside existing Engine contracts

The user owns new research semantics and risk choices; the Agent SHALL faithfully capture clear controls, interpret them against actual evidence, preserve the strength of clear exclusions, and surface limitations. The Engine SHALL continue to own schema, host policy, provenance, receipt, source floor, Gate and lifecycle verdicts. User text or Agent interpretation SHALL NOT bypass, weaken, fabricate, or override those Engine-owned facts.

A material conflict between controls and selected profile, root must-answer set, or style meaning SHALL be resolved at existing HITL1 before silent work. A later discovered infeasibility SHALL follow only an already accepted limitation, degraded, HITL2, or held-checkpoint route; it SHALL NOT create a new interaction phase or a user-control exception to a Gate.

#### Scenario: strict source policy is infeasible
- **WHEN** a user control prohibits material needed to meet an existing evidence floor
- **THEN** the Agent preserves the prohibition and exposes the lawful existing limitation or escalation boundary
- **AND** the Engine does not mark a failed floor as passed or accept prohibited material silently

### Requirement: HITL1 local-file input is bounded snapshot convenience

At HITL1, a user MAY explicitly direct the Agent to read a local file to obtain intended research controls. The Agent SHALL capture only applicable, shareable control material into the one host-file snapshot and SHALL NOT retain the source path, reread it in later phases, recursively ingest links, copy unrelated content, or create a live knowledge-pack protocol.

If the file is unreadable, materially ambiguous, too broad to identify the intended shareable controls, or conflicts materially with proposed work, the Agent SHALL ask only for the smallest needed clarification, excerpt, or host prerequisite at HITL1. It SHALL NOT invent a snapshot or treat the file as authority to bypass framework or host constraints.

#### Scenario: unreadable local file does not fabricate controls
- **WHEN** the user-directed local file cannot be read under current host permission
- **THEN** no control snapshot or external path is recorded
- **AND** HITL1 names the smallest missing prerequisite before ordinary Agent execution resumes
