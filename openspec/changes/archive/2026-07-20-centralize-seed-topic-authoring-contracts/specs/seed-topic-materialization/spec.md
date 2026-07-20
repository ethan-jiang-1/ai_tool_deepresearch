> req: STM-001

## MODIFIED Requirements

### Requirement: Seed topic materialization phase node

`phase-seed-topics.md` SHALL provide a complete 9-section body between setup and Wave0. Section 3 Allowed Actions SHALL retain the queue-driven three-stage mode: fill, execution loop, then finalize and gate.

The phase SHALL declare `phase: seed-topics`, `gate: seed-topics-ready`, and `stop: "no"`.

Allowed Actions SHALL retain these stages:

**Section 3.1 Filling** - On first entry when the queue is empty:

- read `rb_plan.md` frontmatter `topic_registry`;
- create one complete QueueItemSchema task card per Topic, including the accepted identity, title, `targets: { controller: "main-agent" }`, `producer_rule: seed_topic_materialize`, `priority_class: P3_current_gate_gap`, receipts, and done condition; `main-agent` remains the queue-schema wire value;
- enqueue each task through `operate-queue enqueue <bundle> --task <task.json>`; and
- run `operate-queue check <bundle>` after filling to confirm the active window.

**Section 3.2 Queue-driven execution loop:**

- run `operate-queue claim <bundle> --actor main-agent`; an item of `null` moves to Section 3.3;
- resolve `task.payload.topic_slug` to `topic_registry` plus `rb_profile.yaml`, then materialize `seed_topics/<slug>.md` from the Seed Topic file contract;
- run `operate-queue complete <bundle> --result <result.json>` through receipt validation and promotion/repair;
- read the queue projection and return to claim.

**Section 3.3 Finalize and gate:**

- run `check-gate-seed-topics-ready.mjs` and follow the existing Sections 6/7 pass/fail behavior.

The Phase Agent SHALL receive one framework-owned shared seed-topic authoring contract through the phase's actual loaded `requires` chain. That shared Markdown surface SHALL be the single complete human/Agent reading entry for:

- initialization frontmatter and the search-relevant body skeleton;
- the research-appendix boundary, canonical headings, Wave responsibility table and accepted one-time backfill tokens;
- the appendix section/token skeleton and a pointer to the separate shared return-map authoring contract; and
- an optional rerun-direction fragment used only by sanctioned rerun from recorded rationale.

Each `seed_topics/<slug>.md` SHALL retain the accepted two-part structure.

**Initialization area:**

- YAML 1.2 frontmatter parsed by the existing YAML reader. JSON remains a valid YAML 1.2 subset, while multiline YAML is the canonical readable presentation. It SHALL include canonical UID/id/slug/title binding and the accepted `must_answer`, `hypothesis`, `in_scope`, `out_of_scope`, `search_guardrails` (`required_terms`, `forbidden_broadening`), and `evidence_route` (`preferred_sources`, `noise_to_avoid`) enrichment fields.
- Body sections SHALL retain topic positioning, numbered investigatable must-answers, known/gap/tension framing, why-now trigger/window, in-scope/out-of-scope boundary, evidence anchors/preferred sources with trust cues, final-deliverable importance, and optional downstream position.

**Research-round appendix, prepositioned but not filled by seed-topics:**

- use the explicit `═══ 研究轮次追加区 ═══` boundary;
- include the accepted responsibility mapping from Wave0 to new evidence, Wave1 to mechanisms/trends, Wave2 to current judgment, and each round to pending-question status;
- retain the accepted History Summary, New Evidence, New Mechanism Understanding, New Trends And Difficulties, Current Judgment, and Pending Questions section family under the existing Chinese canonical headings;
- retain exactly the accepted one-time token set in its owning sections; and
- keep empty later-Wave sections legal for `seed-topics-ready`.

If `topic_registry` or `rb_profile.yaml` lacks enough information for initialization enrichment, the Agent SHALL record an explicit gap such as `hypothesis: "pending - HITL1 did not provide enough constraints"` and SHALL NOT invent information.

`phase-seed-topics.md` and rerun add-topic guidance SHALL reference the loaded shared seed-topic contract at their materialization decision points and SHALL NOT carry independently maintained complete seed skeletons. Wave phases SHALL instead load the focused shared return-map authoring contract; they SHALL NOT load the unrelated initialization/direction skeleton merely to obtain appendix producer rules. The deterministic new-seed renderer's existing ordered appendix arrays/markers SHALL remain the sole runtime structural manifest; the shared Markdown is its Agent-facing mirror, not a third registry. The renderer SHALL emit the same ordered appendix headings and token set as that shared canonical skeleton. Executable parity tests SHALL fail on a missing, extra, reordered, or renamed canonical appendix heading/token while ignoring prose bytes, YAML mapping order, and presentation-only whitespace.

The shared authoring contract and renderer parity SHALL NOT create new identity, evidence, or gate authority. `rb_plan.md#/topic_registry` remains canonical Topic intent/identity, submitted work-unit/finding facts remain return-map projection authority, and `seed-topics-ready` retains its existing structure/quantity/identity boundary:

| Field group | Validator | Method |
|---|---|---|
| UID/id/slug/title and filename consistency | existing deterministic topic-state/gate owners | canonical binding, non-empty field, and slug consistency |
| `must_answer`, `hypothesis`, `search_guardrails`, `evidence_route` | Agent-flow/controlled authoring proof | inspect the materialized document without treating gap markers as failure |
| semantic quality | Agent judgment from accepted HITL1 semantics | do not replace missing semantics with Engine-generated content |

#### Scenario: Phase Agent executes seed-topics via queue-driven loop

- **WHEN** the Phase Agent loads `phase-seed-topics.md`
- **THEN** Section 3 SHALL direct fill, queue execution, and finalize-plus-gate
- **AND** the body SHALL NOT regress to free-form Allowed Actions
- **AND** the loaded required context SHALL include the shared seed-topic authoring contract

#### Scenario: Seed topic file is a search-relevant decision document

- **WHEN** the Phase Agent materializes a seed topic
- **THEN** the output SHALL contain the accepted intent/enrichment frontmatter fields and search-relevant semantic body sections
- **AND** SHALL preserve explicit gap markers when upstream semantics are absent
- **AND** SHALL NOT be only UID/id/slug/title plus a generic chapter-label body

#### Scenario: Shared contract is the complete readable skeleton

- **WHEN** an Agent needs to materialize an initial or rerun-added seed topic
- **THEN** one loaded shared Markdown surface SHALL expose the complete initialization and research-appendix skeleton
- **AND** the Agent SHALL NOT need to reconstruct it from multiple independently complete phase examples

#### Scenario: Seed topic contains the research-round appendix

- **WHEN** seed-topics completes
- **THEN** each seed SHALL contain the `═══ 研究轮次追加区 ═══` boundary, responsibility mapping, canonical section family, and accepted one-time tokens/placeholders
- **AND** `seed-topics-ready` SHALL NOT fail solely because the owning later Wave has not filled a section

#### Scenario: Renderer and shared appendix remain structurally aligned

- **WHEN** the deterministic topic-state renderer materializes a new canonical seed
- **THEN** its ordered research-appendix headings and accepted token set SHALL match the shared authoring contract
- **AND** a parity test SHALL fail if either representation drifts independently

#### Scenario: Missing upstream information is recorded as a gap

- **WHEN** `topic_registry` or `rb_profile.yaml` lacks enough hypothesis or search-guardrail detail
- **THEN** the Agent SHALL record an explicit gap
- **AND** SHALL NOT invent information to satisfy presentation
- **AND** the existing gate MAY still pass because semantic completeness is not its authority

#### Scenario: Rerun direction is not prefilled without rationale

- **WHEN** an initial seed or layout-only mutation is materialized without a sanctioned add/refine/supplement rerun rationale
- **THEN** the skeleton SHALL NOT prefill a `## 本轮重跑方向` section or direction token
- **AND** the shared direction fragment SHALL remain an authoring reference rather than runtime state
