# user-research-controls Specification

> req: URC-001, URC-002, URC-003

## Purpose

`user-research-controls` defines how optional user research controls are
captured once in `rb_plan.md` to guide Agent judgment while preserving existing
Engine, Gate, and runtime-authority boundaries.
## Requirements
### Requirement: Optional user research controls have one durable run snapshot

HITL1 SHALL preserve optional user research controls in the current run
bundle's `rb_plan.md## Constraints > ### User Research Controls`; this
host-file subsection is the sole durable narrative authority for the per-run
control brief. The control brief MAY state priorities, exclusions,
source/evidence policy, analytical lens, delivery needs, user context, and an
optional research focus brief. It SHALL have exactly these compatibility
meanings:

- a new bundle with no supplied controls records exactly `未提供额外的本轮研究控制；按已确认的问题、范围和研究 profile 执行。`;
- a new bundle with controls records exactly the label `用户提供的本轮研究控制快照（仅作研究指导，不覆盖 Engine contracts）：` followed by one faithful literal snapshot;
- a legacy bundle without the subsection remains valid and means no additional controls.

When an accepted HITL1 focus is present, its one faithful literal snapshot
SHALL visibly retain two labelled narrative parts: the user's wording verbatim
and the Agent's concise, user-correctable interpretation. This convention is
inside the existing snapshot and SHALL NOT add a profile enum, Topic field,
Gate input, lifecycle field, external path, cross-run memory, machine-scored
semantic schema, or parser. An absent focus SHALL NOT create an empty focus
record or change the existing no-controls/ordinary-controls compatibility
forms.

Only the exact supplied-controls label followed by a complete deterministic
literal snapshot region SHALL mean controls are present to Engine-facing
host-file helpers. A legacy same-named subsection, an incomplete fence, or
other Constraints prose SHALL remain ordinary narrative content rather than an
inferred control state.

The snapshot is captured once for ordinary user controls. A completed material
HITL1 source-access alignment MAY make one bounded amendment to that same snapshot:
it SHALL retain the user's literal final decision to adjust source semantics or to
proceed under the final observed direct-access scope, and it SHALL not duplicate the
raw observation, URLs, tool output, network setting, provider name, retry history,
or an inferred future-access claim. The structured `research_access` observation
remains the sole owner of direct probe facts. An environment-retry request is not a
final amendment; only the final resolved user decision may be recorded.

An acceptance of current scope SHALL not silently weaken an explicit hard source
constraint. The snapshot SHALL preserve that constraint and record the accepted
limitation as user research guidance. It SHALL not add a profile enum, Topic field,
Gate input, lifecycle field, external path, cross-run memory, machine-scored
semantic schema, parser, or override token.

#### Scenario: Final accepted limitation is recoverable guidance

- **WHEN** the user clearly says to proceed under the final observed direct-access
  limitations
- **THEN** HITL1 SHALL append one faithful literal access-alignment decision to the
  existing controls snapshot
- **AND** the direct probe facts remain only in `research_access`

#### Scenario: Environment retry does not create history

- **WHEN** the user asks for another probe after managing their own environment
- **THEN** the controls snapshot SHALL not append an interim retry record
- **AND** the fresh probe replaces the current structured observation rather than
  accumulating a network history or requiring the Agent to verify the change

#### Scenario: Hard source constraint remains explicit

- **WHEN** a user accepts current access limits while retaining a strict source
  policy
- **THEN** the controls snapshot SHALL preserve both the original constraint and the
  literal accepted limitation
- **AND** later research SHALL not silently substitute prohibited sources

#### Scenario: no additional controls use the normal path
- **WHEN** the user supplies no extra research controls or focus at HITL1
- **THEN** HITL1 records the explicit no-controls form in the dedicated subsection
- **AND** Seed, Wave, and Final use the existing question/profile path without a new Gate requirement

#### Scenario: focus remains literal and distinct from interpretation
- **WHEN** the user accepts a natural-language focus during HITL1
- **THEN** the supplied-controls snapshot SHALL retain the user's wording
  verbatim and a separately labelled Agent interpretation
- **AND** the snapshot SHALL remain readable research guidance rather than a
  structured focus state or Engine semantic verdict

#### Scenario: legacy bundle remains compatible
- **WHEN** a valid legacy `rb_plan.md` has no `User Research Controls` subsection
- **THEN** later phases treat it as no additional controls
- **AND** no migration, failure, inferred focus, or inferred user preference is created

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
