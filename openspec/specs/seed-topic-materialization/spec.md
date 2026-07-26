# Seed Topic Materialization

> req: STM-001, STM-002, STM-003, STM-004, STM-005, STM-006, STM-007, STM-008

## Purpose

定义在 setup 与 wave0 之间插入的 **seed topic 物化阶段**（`phase-seed-topics.md` + `seed-topics-ready` gate）。此阶段强制 Phase Agent 把 `rb_plan.md` frontmatter 中的 `topic_registry` 物化为 `seed_topics/` 目录下的独立文件，并用 deterministic 规则检查结构合法性与数量 floor。

**存在的理由**：`wff-pre-research` 的 HITL1 只把 seed topics 写进 `rb_plan.md` 的 `topic_registry` frontmatter，从不物化到 `seed_topics/` 目录。`setup-ready` gate 只检查 `seed_topics/` 目录存在（空目录也 pass），导致 Phase Agent 可带着空 `seed_topics/` 进入 Wave0 研究。虽然 `wff-research-waves` 的 `wave0-complete` gate 已设计"topic_registry 为空时 fail"的防线，但该防线位置过晚（在 Wave0），且只检查 registry 非空，不检查物化一致性或数量 floor。本阶段把这道防线前移并加固为独立确定性 gate。

Gate 只做 deterministic 结构/数量/一致性检查；seed topic 的语义质量（topic 是否"好"、是否与研究问题对齐）由人类在 HITL1（`stop: yes`）审查，本阶段不新增 stop 点。
## Requirements
### Requirement: Seed topic materialization phase node

`phase-seed-topics.md` SHALL provide a complete 9-section body between setup and Wave0. Section 3 Allowed Actions SHALL retain the queue-driven three-stage mode: fill, execution loop, then finalize and gate.

The phase SHALL declare `phase: seed-topics`, `gate: seed-topics-ready`, and `stop: "no"`.

Allowed Actions SHALL retain these stages:

**Section 3.1 Filling** - On first entry when the queue is empty:

- read `rb_plan.md` frontmatter `topic_registry`;
- create one complete QueueItemSchema task card per Topic, including the accepted identity, title, `targets: { controller: "main-agent" }`, `producer_rule: seed_topic_materialize`, `priority_class: P3_current_gate_gap`, receipts, and done condition; `main-agent` remains the queue-schema wire value;
- make the task action/done condition require the existing seed body plus one complete `enrich_seed` structured input, and SHALL NOT instruct the Agent to hand-author canonical YAML fields or duplicate registry/enrichment values in body prose;
- enqueue each task through `operate-queue enqueue <bundle> --task <task.json>`; and
- run `operate-queue check <bundle>` after filling to confirm the active window.

**Section 3.2 Queue-driven execution loop:**

- run `operate-queue claim <bundle> --actor main-agent`; an item of `null` moves to Section 3.3;
- resolve `task.payload.topic_slug` to exactly one current `topic_registry` UID plus `rb_profile.yaml` and the existing UID-bound seed;
- edit only the Agent-owned Markdown body sections, preserving canonical frontmatter, the research appendix and any sanctioned rerun direction, except for an `enrich_seed` apply result that names one exact frontmatter syntax coordinate;
- write one retained complete `enrich_seed` input containing only the selected `topic_uid` and the five allowed enrichment fields, then invoke `operate-topic-state apply`; malformed input fails at that checkpoint, while an unparseable frontmatter exception permits only the named syntax repair, never canonical-value authoring, followed immediately by the same writer;
- run `operate-queue complete <bundle> --result <result.json>` through receipt validation, the shared authoring evaluator and promotion/repair;
- read the queue projection and return to claim.

**Section 3.3 Finalize and gate:**

- run `check-gate-seed-topics-ready.mjs` and follow the existing Sections 6/7 pass/fail behavior.

The Phase Agent SHALL receive one framework-owned shared seed-topic authoring contract through the phase's actual loaded `requires` chain. That shared Markdown surface SHALL be the single complete human/Agent reading entry for:

- the canonical frontmatter envelope, the closed structured enrichment input and the non-duplicating search-relevant body skeleton;
- the research-appendix boundary, canonical headings, Wave responsibility table and accepted one-time backfill tokens;
- the appendix section/token skeleton and a pointer to the separate shared return-map authoring contract;
- the body-edit -> `enrich_seed` apply -> queue-complete legal loop and direct-root repair ownership; and
- an optional rerun-direction fragment used only by sanctioned rerun from recorded rationale.

Each `seed_topics/<slug>.md` SHALL retain the accepted two-part structure.

**Initialization area:**

- YAML 1.2 frontmatter parsed by the existing YAML reader. JSON remains a valid YAML 1.2 subset, while multiline YAML is the canonical readable presentation. It SHALL include registry-projected canonical `topic_uid`, `id`, `slug`, `title`, `must_answer`, `scope_role`, and `depends_on_topic_uids`, followed by Agent-owned `hypothesis`, `in_scope`, `out_of_scope`, `search_guardrails` (`required_terms`, `forbidden_broadening`), and `evidence_route` (`preferred_sources`, `noise_to_avoid`). The Agent SHALL submit only the latter five fields through the strict `enrich_seed` input; the Engine SHALL copy the canonical fields from the registry and serialize the complete frontmatter once.
- Body sections SHALL retain topic positioning, known/gap/tension framing, why-now trigger/window, final-deliverable importance, optional downstream position and the research-round appendix. New skeletons SHALL NOT contain or require a body copy of canonical `must_answer`, `in_scope`/`out_of_scope`, or `evidence_route`; downstream consumers SHALL read those structured values from registry/frontmatter rather than compare duplicate body prose.

**Research-round appendix, prepositioned but not filled by seed-topics:**

- use the explicit `═══ 研究轮次追加区 ═══` boundary;
- include the accepted responsibility mapping from Wave0 to new evidence, Wave1 to mechanisms/trends, Wave2 to current judgment, and each round to pending-question status;
- retain the accepted History Summary, New Evidence, New Mechanism Understanding, New Trends And Difficulties, Current Judgment, and Pending Questions section family under the existing Chinese canonical headings;
- retain exactly the accepted one-time token set in its owning sections; and
- keep empty later-Wave sections legal for `seed-topics-ready`.

If `topic_registry` or `rb_profile.yaml` lacks enough information for initialization enrichment, the Agent SHALL submit an explicit non-empty gap such as `hypothesis: "pending - HITL1 did not provide enough constraints"` and SHALL NOT invent information. A gap value SHALL satisfy structural authoring without becoming a semantic-quality verdict.

`phase-seed-topics.md` and rerun add-topic guidance SHALL reference the loaded shared seed-topic contract at their materialization decision points and SHALL NOT carry independently maintained complete seed skeletons or raw-canonical-YAML instructions. Wave phases SHALL instead load the focused shared return-map authoring contract; they SHALL NOT load the unrelated initialization/direction skeleton merely to obtain appendix producer rules. The deterministic new-seed renderer's existing ordered appendix arrays/markers SHALL remain the sole runtime structural manifest; the shared Markdown is its Agent-facing mirror, not a third registry. The renderer SHALL emit the same ordered appendix headings and token set as that shared canonical skeleton. Executable parity tests SHALL fail on a missing, extra, reordered, or renamed canonical appendix heading/token while ignoring prose bytes, YAML mapping order, quoting style and presentation-only whitespace. A focused Markdown regression SHALL additionally fail if the normal phase/task/shared guidance again asks the Agent to hand-author a canonical key or author `must_answer`, scope or evidence route on both frontmatter and body surfaces.

The shared authoring contract and renderer parity SHALL NOT create new identity, evidence, or gate authority. `rb_plan.md#/topic_registry` remains canonical Topic intent/identity, the seed frontmatter remains the structured enrichment surface, submitted work-unit/finding facts remain return-map projection authority, and `seed-topics-ready` retains its existing structure/quantity/identity boundary:

| Field group | Validator | Method |
|---|---|---|
| UID/id/slug/title/must-answer/scope-role/dependencies and filename consistency | existing deterministic topic-state/evaluator/Gate owners | parsed-value canonical binding, non-empty field, and slug consistency |
| `hypothesis`, `in_scope`, `out_of_scope`, `search_guardrails`, `evidence_route` | topic-state `enrich_seed` input | closed structural validation; explicit non-empty gaps remain legal |
| semantic quality and Markdown body judgment | Agent judgment from accepted HITL1 semantics | no Engine generation/scoring and no duplicate-prose equality rule |

Existing seeds MAY retain legacy `## must_answer`, scope or evidence-route body sections. The enrichment writer SHALL preserve the exact lexical body suffix after the closing frontmatter delimiter's terminating LF, including any leading blank line and those legacy bytes, but those sections SHALL NOT own canonical/structured values, satisfy a missing frontmatter field, or be compared by queue completion or Gate. No bulk migration SHALL be required.

#### Scenario: Phase Agent executes seed-topics via queue-driven loop

- **WHEN** the Phase Agent loads `phase-seed-topics.md`
- **THEN** Section 3 SHALL direct fill, body edit plus structured enrichment apply, queue completion, and finalize-plus-gate
- **AND** the body SHALL NOT regress to free-form Allowed Actions or raw canonical YAML authoring
- **AND** the loaded required context SHALL include the shared seed-topic authoring contract

#### Scenario: Seed topic file is a search-relevant decision document

- **WHEN** the Phase Agent materializes or enriches a seed topic
- **THEN** the output SHALL contain registry-projected canonical fields, all accepted structured enrichment frontmatter fields and the non-duplicating search-relevant semantic body sections
- **AND** SHALL preserve explicit gap values when upstream semantics are absent
- **AND** SHALL NOT be only UID/id/slug/title plus a generic chapter-label body

#### Scenario: Shared contract is the complete readable skeleton

- **WHEN** an Agent needs to materialize an initial or rerun-added seed topic
- **THEN** one loaded shared Markdown surface SHALL expose the complete structured input, non-duplicating initialization body and research-appendix skeleton
- **AND** the Agent SHALL NOT need to reconstruct the legal writer loop from multiple phase examples or hand-copy registry fields

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
- **THEN** the Agent SHALL submit a structurally valid explicit gap through `enrich_seed`
- **AND** SHALL NOT invent information to satisfy presentation
- **AND** the existing gate MAY still pass because semantic completeness is not its authority

#### Scenario: Canonical and structured fields are not authored twice

- **WHEN** the Agent follows the current phase task card and shared authoring contract
- **THEN** `must_answer` SHALL be copied by Engine from the registry without Agent summary or body duplication
- **AND** `in_scope`, `out_of_scope`, and `evidence_route` SHALL be authored once in the structured enrichment object/frontmatter
- **AND** the Markdown body SHALL remain available for non-duplicating research judgment

#### Scenario: Legacy duplicate body sections remain read-compatible

- **WHEN** an in-flight or pre-v0.50 seed contains legacy body copies of must-answer, scope or evidence-route prose
- **THEN** `enrich_seed` SHALL preserve those body bytes and normal deterministic checks SHALL ignore them as authority
- **AND** no migration or body-to-frontmatter inference SHALL be required for completion

#### Scenario: Rerun direction is not prefilled without rationale

- **WHEN** an initial seed or layout-only mutation is materialized without a sanctioned add/refine/supplement rerun rationale
- **THEN** the skeleton SHALL NOT prefill a `## 本轮重跑方向` section or direction token
- **AND** the shared direction fragment SHALL remain an authoring reference rather than runtime state

### Requirement: Seed topics ready gate rule set

`DPT_FRAMEWORK/schema/gate_definitions/gate-seed-topics-ready.definition.json` SHALL 定义当前 contract 下的 deterministic rules。

规则 SHALL 覆盖（全部 deterministic，无语义判断）：
- `seed_topics/` 目录非空（至少 1 个 `.md` 文件）
- 每个 `seed_topics/<slug>.md` 的 frontmatter `title` 非空（`field_non_empty` check type）；frontmatter `slug` 与文件名 stem 一致由 `cross_field(slug_consistency)` 的 per-file 校验覆盖
- `seed_topics/` 下文件 slug 集合 = `rb_plan.md#/topic_registry` 的 slug 集合（双向一致，无多余、无缺失）
- trace 中有 `seed_topics_completion` event（`trace_event_present` check type）
- `rb_status.json#/current_gate == seed_topics_ready`
- `rb_status.json#/next_gate == wave0_complete`

Topic 集合的 source of truth SHALL 为 `rb_plan.md` frontmatter 的 `topic_registry`（与 `wave0-complete` gate D5 一致）。Gate SHALL 枚举 registry 的 slug，SHALL NOT 扫描磁盘推断 topic 集合。`topic_registry` 为空时 gate SHALL return `passed: false`。

#### Scenario: All seed topics rules pass

- **WHEN** registry 含 3 个 topic，`seed_topics/` 下有 3 个对应 `.md` 文件，slug 双向一致，frontmatter 合法，trace 有 `seed_topics_completion`
- **THEN** gate SHALL return `passed: true`，`check.next` 指向 `phases/phase-wave0.md`

#### Scenario: Slug mismatch fails

- **WHEN** `seed_topics/` 下文件 slug 集合与 registry slug 集合不一致（多余、缺失或拼写不同）
- **THEN** gate SHALL return `passed: false`，`inspect` SHALL 列出不一致的 slug

#### Scenario: Count below registry fails

- **WHEN** `seed_topics/*.md` 文件数 < registry topic 数
- **THEN** gate SHALL return `passed: false`，`inspect` 指向缺失的 topic 物化文件

#### Scenario: Malformed frontmatter fails

- **WHEN** 某 `seed_topics/<slug>.md` 缺少 `slug` 或 `title`，或 slug 与文件名不一致
- **THEN** gate SHALL return `passed: false`

### Requirement: Seed topics gate CLI implementation

`DPT_FRAMEWORK/cli/gates/check-gate-seed-topics-ready.mjs` SHALL 使用 `gate-helpers.mjs` standard pipeline（`parseGateCliArgs` → `loadGateDefinition` → `validateNodeGateBinding` → iterate rules → `resolveRouting` → `buildGateResult` → `emitGateResult`），延续 `wff-pre-research` / `wff-research-waves` 的 gate CLI 模式。

CLI SHALL 支持 `trace_event_present`（由 `wff-research-waves` 引入的 `readTraceEvents` helper）。

CLI SHALL 实现 slug 一致性检查（`cross_field` 新增 `mode: "slug_consistency"`）：读取 `seed_topics/` 下所有 `.md` 的 frontmatter slug + 文件名 stem 组成磁盘 slug 集合，与 `rb_plan.md#/topic_registry` 的 slug 集合比较，双向一致才 pass。此 mode 与 `basename_consistency` 和 `markdown_link_resolution` 并列，由 gate definition JSON 的 `mode` 字段区分。

CLI SHALL 延续 double trace 约定：gate attempt 写入 `rb_trace.jsonl`。

#### Scenario: Empty seed_topics directory detected

- **WHEN** `seed_topics/` 存在但为空目录
- **THEN** `dir_non_empty` rule SHALL fail，gate SHALL return `passed: false`，`inspect` 指向空目录

#### Scenario: Slug consistency bi-directional

- **WHEN** registry 有 slug A/B/C 但磁盘只有 A/B
- **THEN** cross_field(slug_consistency) SHALL fail，inspect 报告缺失 C
- **WHEN** 磁盘有 A/B/C/D 但 registry 只有 A/B/C
- **THEN** cross_field(slug_consistency) SHALL fail，inspect 报告多余 D

### Requirement: Workflow registration of seed-topics phase

Workflow registration surface SHALL 同步插入 seed-topics 阶段，保持 transition 一致性：
- `DPT_FRAMEWORK/workflows/manifest.json`：phases 数组在 setup 与 wave0 之间插入 `{ "key": "seed-topics", "node": "phases/phase-seed-topics.md", "gate": "seed-topics-ready" }`
- `DPT_FRAMEWORK/workflows/transitions.chain.json`：`phase-setup.md` 的 `passed` 改指向 `phase-seed-topics.md`；新增 `phase-seed-topics.md` → `passed` → `phase-wave0.md`
- `DPT_FRAMEWORK/schema/enums.mjs` 的 `CurrentGate`：新增 `seed_topics_ready`（位于 `setup_ready` 与 `wave0_complete` 之间）

`rb_status.json` 模板（`rb_templates/`）的 `current_gate`/`next_gate` 初始值 SHALL 直接反映新阶段：`current_gate` SHALL 为 `setup_ready`，`next_gate` SHALL 为 `seed_topics_ready`。

#### Scenario: Transition chain routes through seed-topics

- **WHEN** setup gate pass 后查询 next node
- **THEN** routing SHALL 返回 `phases/phase-seed-topics.md`，而非直接 `phases/phase-wave0.md`
- **AND** seed-topics gate pass 后 routing SHALL 返回 `phases/phase-wave0.md`

### Requirement: Seed topics boundary enforcement playbook

The current manifest-registered `case-124-standard-seed-topics-boundary` role SHALL verify the seed-topics gate materialization path and boundary enforcement in a fresh contained disposable bundle. It SHALL pre-seed post-setup topic registry state, materialize all seed topics for a real pass, and exercise empty-directory, missing-slug and extra-file failures with inspect identifying the applicable `dir_non_empty` or bidirectional `slug_consistency` boundary. Its Markdown body SHALL expose slug-consistency DO/DON'T guidance.

Every verdict-affecting boundary SHALL be recorded as a stable strict playbook-owned check in bundle-root `rb_trace.jsonl`; V2 required checks and native completion SHALL replace the removed legacy `test-simple-*` path and any console-only verdict. The Playbook Agent SHALL stop before Supervisor health/cleanup.

#### Scenario: Seed topics pass and fail are trace-backed

- **WHEN** registry and seed files are complete and bidirectionally slug-consistent
- **THEN** the real seed-topics gate SHALL pass
- **AND WHEN** the directory is empty or slugs are missing/extra
- **THEN** the real gate SHALL fail with the applicable inspect
- **AND** native completion SHALL require the case-owned pass and three negative-boundary check IDs

#### Scenario: Seed topics pass and fail both trace-backed

- **WHEN** registry entries and `seed_topics/` files are bidirectionally slug-consistent
- **THEN** the real seed-topics gate passes
- **AND WHEN** the directory is empty or a slug is missing or extra
- **THEN** the real gate fails with applicable inspect
- **AND** native completion derives the verdict from the required one pass and three negative-boundary root-trace checks

### Requirement: Topic slug SHALL include zero-padded numeric prefix

`topic_registry` 中每个 entry 的 `slug` 字段 MUST 使用 `NN_descriptive-name` 格式，其中 `NN` 为零填充的 1-based 序号（`01`、`02`、... `0N`），按该 entry 在 `topic_registry` 数组中的位置确定。`descriptive-name` SHALL 为 kebab-case 描述性短名。

本 requirement 不强制 `id` 字段的格式——`id` SHOULD 与 `NN` 一致（如 `"01"`）以保持一致性，但 gate 不校验 `id` 格式。`NN` 的 source of truth SHALL 为 `topic_registry` 数组顺序，NOT `id` 字段。

Gate 的 `per_file_slug_stem_consistency` rule（byte-for-byte `file_stem == frontmatter_slug`）和 `slug_consistency` rule（bidirectional `disk_slug_set == registry_slug_set`）均 SHALL 自然兼容此前缀约定——因为前缀是 slug 本身的一部分，不需 gate 改动。

#### Scenario: Topic registry entries have NN-prefixed slugs

- **WHEN** `topic_registry` 包含 3 个 topic
- **THEN** 第 1 个 entry 的 `slug` SHALL 以 `01_` 开头
- **AND** 第 2 个 entry 的 `slug` SHALL 以 `02_` 开头
- **AND** 第 3 个 entry 的 `slug` SHALL 以 `03_` 开头

#### Scenario: ls seed_topics shows files in numeric order

- **WHEN** `seed_topics/` 下有 5 个物化文件，slug 分别为 `01_meal-timing-...`、`02_front-vs-back-...`、`03_late-eating-...`、`04_early-vs-late-...`、`05_timing-causation-...`
- **THEN** `ls seed_topics/` SHALL 按 `01_`, `02_`, `03_`, `04_`, `05_` 字母序（即 registry 数组顺序）排列
- **AND** 用户 SHALL 无需打开 frontmatter 即可从文件名看出 topic 顺序

#### Scenario: Gate triple consistency passes with NN_ prefix slug

- **WHEN** registry slug = `"01_meal-timing-blood-glucose-insulin"`
- **AND** seed topic 文件名为 `01_meal-timing-blood-glucose-insulin.md`
- **AND** frontmatter `slug: 01_meal-timing-blood-glucose-insulin`
- **THEN** `per_file_slug_stem_consistency` rule SHALL pass（`file_stem` == `frontmatter_slug` == `"01_meal-timing-blood-glucose-insulin"`）
- **AND** `slug_consistency` rule SHALL pass（disk slug set == registry slug set）

#### Scenario: Downstream paths inherit NN_ prefix from slug

- **WHEN** topic slug = `"01_meal-timing-..."`
- **THEN** `artifacts/wave0/01_meal-timing-.../source.yaml` SHALL be the artifact path
- **AND** `artifacts/wave1/01_meal-timing-.../evidence-summary.md` SHALL be the artifact path
- **AND** `seed_topics/01_meal-timing-....md` SHALL be the seed topic file
- **AND** all paths SHALL be constructed from `{topic.slug}` without additional prefix decoration

### Requirement: Seed topics SHALL be UID-bound canonical projections

Every canonical registry entry SHALL have exactly one `seed_topics/<slug>.md` projection carrying matching topic UID, id, slug, title, must-answer set, scope role and dependency UIDs. Migrate-legacy/add/update apply and any required explicit recover SHALL finish registry and touched seed replacements before topic-scoped queue/content work. Seed presence or filename SHALL NOT create topic identity independently.

HITL1 topic-state apply SHALL create the initial UID-bound seed skeleton after user approval. The seed phase SHALL verify and enrich that projection; it SHALL NOT remain the first durable writer of approved topic intent.

For canonical plans, seed readiness SHALL validate exact UID/slug/intent binding. Existing legacy bundles MAY continue the accepted slug-only seed compatibility path until sanctioned rerun migration; that path SHALL NOT synthesize UIDs, create canonical topics or authorize add/update mutation. Its retirement condition SHALL be C5-backed migration/reentry coverage plus migrated supported legacy fixtures, not an unbounded second authority path.

#### Scenario: Add commits seed before work eligibility
- **WHEN** topic-state apply adds a topic
- **THEN** canonical registry and matching complete UID-bound seed SHALL commit before the topic is eligible for work

#### Scenario: Orphan seed does not become authority
- **WHEN** a seed has no matching canonical UID
- **THEN** inspect/gate SHALL report an orphan projection and SHALL NOT infer a new topic

#### Scenario: Legacy seed compatibility does not become canonical authority
- **WHEN** a resumed legacy bundle follows its existing slug-only seed path before sanctioned rerun migration
- **THEN** existing compatibility behavior MAY continue
- **AND** no UID, topic addition or intent mutation SHALL be inferred from seed filename or prose

### Requirement: Seed projection SHALL follow committed current topic layout

After successful layout mutation, every remaining canonical topic SHALL have exactly one UID-bound `seed_topics/<current-slug>.md` projection with current id/slug/title and unchanged semantic intent unless the explicit layout target changed title. Previous seed filenames SHALL not remain as aliases. Safe remove MAY delete only the seed of a topic already proven to have no durable history or dependency.

A generated new current seed path SHALL be created only when absent or when it is the same UID's existing current seed path being replaced. An unexplained existing target SHALL block rather than be adopted or overwritten.

#### Scenario: Renumber replaces and rebinds seed
- **WHEN** a topic keeps its UID but receives a new ordinal slug
- **THEN** recovery SHALL leave one seed at the current path with matching current metadata
- **AND** no old-path seed alias SHALL remain

#### Scenario: Seed replacement crash exposes exact recovery
- **WHEN** the process stops after the new current seed is written but before registry replacement or old-seed cleanup
- **THEN** topic-state inspect SHALL report the accepted workspace and exact recover command
- **AND** seed/gate checks SHALL short-circuit downstream mismatch noise

#### Scenario: Orphan target seed is not overwritten
- **WHEN** the target current seed filename already exists without binding to the same UID's current projection
- **THEN** layout apply SHALL reject before prepared publication and preserve that file
