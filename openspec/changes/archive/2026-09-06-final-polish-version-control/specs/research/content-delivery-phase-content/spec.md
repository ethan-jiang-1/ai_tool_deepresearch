> req: CDP-006, CDP-008

## MODIFIED Requirements

### Requirement: Final delivery remains terminal while iterating in place

Final SHALL remain the unique terminal delivery node, `gate: null`, with no
outgoing transition, while supporting iteration in place. The first legal Final
entry SHALL deliver the primary report first, then invite and wait for user
feedback, staying in the same Final node for every legal revision. Each revision
SHALL be classified by the Final Agent's bounded semantic judgment:

- presentation-only polish (Evidence Map backing set and submitted fact set
  unchanged; only structure, length, wording, emphasis, or presentation of
  existing verified evidence differ) SHALL be applied as a presentation
  revision — a compare-and-swap update of the current latest primary bytes at
  the existing canonical target, no new global version is allocated, the
  version's REVISIONS.md records the change, and any earlier primary revision
  bytes remain immutable;
- evidence-expanding feedback (new sources, Topics, research conclusions, or
  research-profile changes) SHALL leave Final only through the existing audited
  post-final rerun path and SHALL result in a new global version on the
  resulting legal Final delivery.

Satisfaction ends the current interaction only; it does not fabricate an Engine
verdict, profile counter, or satisfaction state. The Final Agent SHALL NOT
silently renumber, delete, or rewrite any committed primary revision, and SHALL
NOT auto-retire a version (retirement is a human-controlled correction
operation owned by artifact persistence).

#### Scenario: Final delivery is not a third in-run checkpoint

- **WHEN** Final presents a committed report and asks whether the user wants it adjusted
- **THEN** the lifecycle SHALL remain terminal with no Gate or outgoing transition
- **AND** the feedback invitation SHALL not create a HITL decision enum or persisted verdict

#### Scenario: User-initiated turn during Final is answered without opening a Final loop

> **@deprecated behavior** — The scenario title is retained as an archive
> anchor. “Without opening” now means no lifecycle/Gate/HITL loop; bounded
> presentation refinement is handled by the already-current Final interaction.

- **WHEN** the user gives clear presentation feedback after a committed Final report
- **THEN** the Agent SHALL revise from current verified facts, publish one next version, and remain in Final
- **AND** it SHALL not route the request through HITL2 or audited rerun

#### Scenario: Final does not inherit HITL2 prompt-side mapping

- **WHEN** Final receives natural-language satisfaction, revision, or clarification text
- **THEN** it SHALL interpret that text only for the bounded delivery interaction
- **AND** it SHALL not map it into `human_decision_checkpoints.hitl2` unless the request explicitly requires the accepted post-final rerun path

#### Scenario: Final narrative prefers Chinese without translating canonical tokens

- **WHEN** Final generates, delivers, or discusses a report and the user requested no other language
- **THEN** guidance SHALL prefer Chinese narrative
- **AND** citations, source titles, paths, commands, field names, and enum values SHALL remain canonical

#### Scenario: Satisfied user ends interaction without new state

- **WHEN** the user says the current version is satisfactory or requests no further change
- **THEN** the Agent SHALL end the current interaction without publishing another version
- **AND** the Engine SHALL not write a satisfaction flag, Gate event, status transition, or trace event

#### Scenario: Post-final rerun uses audited HITL2 semantics

- **WHEN** feedback explicitly requires a new source, Topic, evidence collection, research conclusion, or research-profile change
- **THEN** the Agent SHALL retain and submit that request through the accepted post-final recovery operation
- **AND** the Engine SHALL record existing HITL2 `rerun` semantics and one lineage-bound handoff to `phases/phase-rerun.md`

#### Scenario: Post-final feedback keeps HITL2 routing

> **@deprecated** — The historical scenario name is retained for archive
> compatibility. Only evidence-expanding feedback keeps audited HITL2 rerun
> routing; presentation-only feedback now remains in Final.

- **WHEN** post-final feedback crosses the verified research boundary
- **THEN** it SHALL use audited post-final rerun rather than a hidden Final transition
- **AND** presentation-only feedback SHALL not be routed there

#### Scenario: Unsupported post-final action remains unavailable

- **WHEN** feedback asks for arbitrary state mutation, history rewrite, report overwrite/deletion, or developer state-seed
- **THEN** the framework SHALL report the missing capability or permission boundary
- **AND** it SHALL not reinterpret the request as presentation refinement or rerun

#### Scenario: Prior Final lineage remains auditable

- **WHEN** one or more Final revisions or a later rerun occur
- **THEN** all earlier report versions and readiness/Final evidence SHALL remain unchanged
- **AND** any rerun recovery event SHALL bind the prior delivery lineage and current rerun lineage

#### Scenario: Final terminal frontmatter has no outgoing edge

- **WHEN** `phase-final.md` is loaded for delivery and refinement
- **THEN** frontmatter SHALL use `gate: null`, `stop: "yes"`, and omit `next`
- **AND** in-place interaction SHALL not create a hidden next phase or Final Gate

#### Scenario: Polish stays in the same Final node and version

- **WHEN** the user gives presentation-only feedback after the first delivery
- **THEN** the Final Agent SHALL apply it as a presentation revision (CAS update of the current latest primary bytes) in the same Final node
- **AND** the version number SHALL NOT change and the Final node SHALL NOT exit

#### Scenario: Evidence expansion leaves Final through the audited path

- **WHEN** the user requests new evidence or a research change
- **THEN** the Final Agent SHALL route through the existing audited post-final rerun path
- **AND** the resulting new legal Final delivery SHALL allocate a new global version

### Requirement: Final guidance SHALL bind auxiliary detail archives to their version and maintain the series index

Final guidance SHALL retain the existing version-bound auxiliary-directory
binding (`final_v<N>` / `final_<feature>_v<N>`), keep the series index current
after every publication and retirement, and extend the archive contract: each
primary version's bound auxiliary directory SHALL carry a self-contained
evidence-details file (e.g. `07-evidence-details.md`) materializing every
declared key finding's conclusion, key numbers, caliber labels, and clickable
external source URLs. The primary report's Evidence Map SHALL direct readers to
this file, so the public delivery (primary MD + bound auxiliary directory) is
self-contained and verifiable without internal `artifacts/` or `reference/`
paths. Every external URL in the evidence-details file SHALL trace to a
submitted reference frontmatter `source_url`; fabricated links SHALL be rejected
before persistence. Presentation revisions SHALL append to the same bound
directory's REVISIONS.md without changing the series index or any version
number.

#### Scenario: One version pairs a primary report with a same-named archive

- **WHEN** Final composes version N
- **THEN** guidance SHALL require the primary report `final/final_v<N>.md` and the archive directory `final/final_v<N>/`
- **AND** the archive directory name SHALL equal the primary report filename without `.md`

#### Scenario: Auxiliary detail stays inside its version directory

- **WHEN** Final writes auxiliary detail for version N
- **THEN** it SHALL be placed under `final/final_v<N>/`
- **AND** it SHALL NOT be placed under another version's directory or a version-decoupled directory

#### Scenario: Primary report cross-references only its own archive

- **WHEN** a primary report links to auxiliary detail in prose
- **THEN** the link SHALL target its own `final/final_v<N>/`
- **AND** it SHALL NOT target another version's archive directory
- **AND** Evidence Map backing links SHALL continue to resolve only to submitted evidence, not Final output

#### Scenario: History stays read-only across versions

- **WHEN** version M with M < N is committed and version N is later composed
- **THEN** `final/final_v<M>.md` and `final/final_v<M>/` SHALL remain byte-identical
- **AND** new detail for version N SHALL be written only under `final/final_v<N>/`

#### Scenario: Series index is maintained through the non-primary path

- **WHEN** a new committed version exists
- **THEN** the Agent SHALL update `final/README.md` through non-primary `persist-final-report`
- **AND** `final/README.md` SHALL describe the naming and independence convention and the version release record
- **AND** it SHALL carry its own bounded Evidence Map and SHALL NOT count as primary delivery

#### Scenario: Version directory carries self-contained evidence details

- **WHEN** a primary version is published with its bound auxiliary directory
- **THEN** the directory SHALL contain an evidence-details file for all declared key findings with external URLs traceable to submitted reference frontmatter
- **AND** the public delivery (primary MD + directory) SHALL be verifiable without internal paths

#### Scenario: Presentation revision appends REVISIONS without index change

- **WHEN** a presentation revision CAS-updates the current latest primary bytes at the existing canonical target
- **THEN** the series index SHALL remain unchanged
- **AND** one REVISIONS.md row SHALL be appended in the bound auxiliary directory
