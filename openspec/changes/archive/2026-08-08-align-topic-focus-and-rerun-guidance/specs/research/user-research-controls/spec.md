# User Research Controls Delta

> req: URC-001

## MODIFIED Requirements

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
