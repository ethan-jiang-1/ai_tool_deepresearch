# Pre-Research Phase Content

> req: PRP-001, PRP-002, PRP-003, PRP-004, PRP-005, PRP-006, PRP-007, PRP-008, PRP-009, PRP-010, PRP-011, PRP-012, PRP-013, PRP-014, PRP-015, PRP-016

> delta-synced: extend-mutate-layout-to-hitl1 (PRP-011)

## Purpose

定义 instantiation、HITL1、setup 三个 phase node 的完整 body 内容要求。每个 phase node body 必须满足当前 workflow-node contract 的 9 个 section，同时严格贴合当前 accepted CLI / schema / bundle contract：instantiation 通过真实 CLI 建 bundle；HITL1 的 runtime truth 写进 `rb_profile.yaml`；setup 只做 structural consistency，不膨胀成 readiness。
## Requirements
### Requirement: Phase instantiation body completeness

`phase-instantiation.md` SHALL 包含完整的 9-section body，引导 Agent 创建真实 runtime bundle。

Section 内容要求：
- **Stage Goal**: 创建 bundle 和 canonical scaffold，不替代后续 HITL / setup / wave
- **Required Inputs**: 用户原始 research question（用于命名）和 `DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs`
- **Allowed Actions**:
  - 生成合适的 bundle 名
  - 调用 `node DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs <name>`
  - 读取 CLI 返回的 bundle 路径
  - reload 新建 bundle 的 control files 和目录结构
- **Expected Artifacts**: 新建 bundle 目录、`BUNDLE_MAP.md`、5 个 `rb_*` control files、canonical scaffold dirs
- **Gate Command**: `node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-instantiation-complete.mjs --bundle <path> --current-node phases/phase-instantiation.md`
- **On Gate Pass**: 读取 `check.next`
- **On Gate Fail**: 读取 `inspect` / `advice`，修复缺失或漂移的 instantiation surface，rerun same gate（默认最多 3 次）
- **Stop Behavior**: `stop: no`
- **Anti-Cheating Rules**: 禁止跳过 CLI 直接手搓"看起来像 bundle"的结果；禁止声称 evidence coverage / synthesis

`phase-instantiation.md` SHALL describe `BUNDLE_MAP.md` as a passive bundle map. It SHALL NOT instruct the Agent to treat the bundle map as an action launcher or phase-control surface.

#### Scenario: Agent executes instantiation phase

- **WHEN** Agent 加载 `phase-instantiation.md`
- **THEN** body SHALL 引导 Agent 调用 `instantiate-run-bundle.mjs`
- **AND** body SHALL NOT 指示 Agent 在这个阶段提 HITL 问题或做 research work

#### Scenario: Instantiation expected artifacts use bundle map

- **WHEN** Agent reads the Expected Artifacts section
- **THEN** it SHALL see `BUNDLE_MAP.md`
- **AND** it SHALL NOT see `START_FROM_HERE.md` as the current expected artifact for new bundles

### Requirement: Phase HITL1 body completeness and stop semantics

`phase-hitl1.md` SHALL retain its complete nine-section body, `stop: yes`, recorded
HITL1 decision, canonical Topic-state, style-handoff, profile-write, Gate, and
silent-execution boundaries. Before the Agent writes the accepted profile, canonical
Topic state, or HITL1 status, it SHALL use HIU-002's research alignment draft to
obtain the smallest required semantic resolution. The Phase MAY construct proposed
must-answer questions and a proposed Topic map for that draft, but SHALL NOT treat
them as canonical Topic state or profile facts until the existing HITL1 decision is
resolved.

Once the user clearly accepts, corrects, or delegates the draft, the Phase Agent
SHALL write a concise `rb_plan.md## Goal > ### HITL1 Alignment Snapshot` before the
existing profile/status/topic-state path. The snapshot SHALL record the confirmed or
delegated goal, the Agent's resolved understanding of object/use/scope, material
forks and transparent defaults, and their relationship to the accepted
must-answer/profile/Topic decisions. It SHALL be narrative context, not a profile
field, Topic identity, Gate input, parser target, conversation transcript, or
lifecycle authority. The Phase then continues the existing semantic decision and
style-handoff path. After the existing semantic decision and style handoff, the
Phase Agent SHALL actor-deliver exactly one isolated probe with the generic
capability-probe safety guide and the separately required
`shared-hitl1-research-access-envelope.md` controller. The Phase itself SHALL not
directly retrieve a sample page.

If a later existing profile, status, or Topic-state operation blocks or fails, the
already-written snapshot remains readable narrative context only. It SHALL NOT be
treated as evidence that any profile/status/Topic fact was recorded, as permission
to advance, or as a substitute for the existing repair/recovery owner. The Agent
SHALL use that existing owner and same legal path; it MAY replace the snapshot only
when a new resolved user decision changes its narrative, without creating a separate
snapshot recovery state.

The controller SHALL own the entire direct-sample experiment: fixed China and
overseas sample suite, diagnostic-only samples, small-batch concurrency cap, primary
deadline, same-URL transport confirmation, reserve-sample condition, round budget,
terminal classification, and one compact return map. It SHALL not use search,
candidate traversal, provider-specific operation names, a run-bundle path, user
topic facts, or runtime/Gate authority. The general guide and Phase body SHALL not
duplicate controller sample, timeout, concurrency, retry, or return-map content.

The Phase Agent SHALL write one returned schema-valid observation unchanged. A spawn
failure, absent return, or invalid return SHALL be written as the controller's
complete honest unavailable relay form, not as a fabricated success. Probe material
does not enter evidence, cache, receipts, ledger, artifacts, references, or coverage
input.

After each completed observation, the Phase Agent SHALL use the original question,
accepted must-answer set, Topic map, explicit source constraints, and the current
controls snapshot to judge whether a China/overseas limitation is material. Chinese
UI language, user language, presumed egress location, and VPN presence are not
semantic evidence of that relevance. When a material gap exists, the Agent SHALL
remain in the same HITL1 conversation and present the smallest decision boundary:
the user may adjust their environment and request a fresh complete probe, revise
their explicit source constraints, or accept research under the currently observed
source-access scope. There is no automatic retry, fixed retry count, polling, VPN
operation, permission bypass, or new HITL checkpoint.

Each user-requested environment retry SHALL start a fresh full dual-group round and
replace the current observation; it SHALL not merge old attempts into a history or
claim that access is durable. The user's new retry request is sufficient: the Agent
SHALL NOT verify, retain, or infer their network adjustment. On a clear final
acceptance, the Agent SHALL retain the user's literal access-scope decision in the
existing controls snapshot, preserve any unrelaxed hard source constraint, then run
the existing Gate. When no material gap exists, the Phase may make the same existing
Gate handoff without creating a user question. A user who neither resolves a material
gap nor requests a new round remains in the existing HITL1 loop.

#### Scenario: Alignment snapshot precedes canonical HITL1 writes

- **WHEN** the user accepts, corrects, or delegates a resolved alignment draft
- **THEN** the Phase SHALL write the required alignment snapshot before it writes
  the accepted profile, HITL1 status, or retained topic-state input
- **AND** it SHALL not create a profile field, Topic identity, Gate input, or
  lifecycle state from the snapshot prose

#### Scenario: Proposed draft data is not canonical state

- **WHEN** the Agent prepares a recommendation and one or more frontier questions
- **THEN** proposed must-answer questions and Topic map entries remain reviewable
  draft content until the existing HITL1 decision resolves
- **AND** the Phase SHALL not run canonical topic-state apply or write a recorded
  HITL1 status merely because a draft was displayed

#### Scenario: Snapshot does not cover a later canonical-write failure

- **WHEN** the alignment snapshot is durable but a later profile, status, or
  canonical Topic-state operation blocks or fails
- **THEN** the snapshot SHALL remain narrative context and SHALL NOT establish a
  recorded profile/status/Topic fact or authorize a Gate/phase advance
- **AND** the Agent SHALL use the existing owner and same repair/recovery path
  without asking the user to repeat a still-readable decision or creating a
  snapshot-specific state

#### Scenario: Probe is direct and executor-neutral

- **WHEN** HITL1 has recorded the ordinary semantic decision
- **THEN** the Phase SHALL spawn one isolated probe with the independent controller
  and safety guidance
- **AND** neither the Phase nor controller SHALL require `WebSearch`, `WebFetch`, a
  Claude launcher, or a provider selection

#### Scenario: Both source groups are observed before semantic judgment

- **WHEN** one China or overseas core sample returns content before another group is
  complete
- **THEN** the controller SHALL continue its bounded work for the other group
- **AND** the Phase SHALL judge relevance only from the completed compact observation

#### Scenario: User-led network retry replaces the observation

- **WHEN** the Agent explains a material access gap and the user requests another
  round after managing their own environment
- **THEN** the Agent SHALL run one new complete probe round and replace the prior
  `research_access` observation
- **AND** it SHALL not retain a URL/attempt matrix, retry counter, or prediction of
  later stability, or verify the reported environment change

#### Scenario: Accepted current scope resumes the existing path

- **WHEN** the user clearly accepts research under the final observed limitations
- **THEN** the Agent SHALL record that literal semantic decision in existing controls,
  retain the truthful observation, run the existing Gate, and follow its existing
  pass path
- **AND** it SHALL not relabel unavailable samples as reachable or silently relax a
  hard source constraint

#### Scenario: Invalid delegation result is honest no-request unavailable

- **WHEN** probe-agent spawn fails, returns nothing, or returns an invalid observation
- **THEN** the Phase Agent SHALL write the controller's complete honest no-request
  unavailable relay form with a direct reason
- **AND** it SHALL preserve recorded choices and expose the same probe/Gate path without
  an automatic retry or an invented success

#### Scenario: Partial material gap is not silently relaxed

- **WHEN** an observed group limitation is material to the recorded research semantics
  and the user has not yet given a final decision
- **THEN** the Agent SHALL remain in the same HITL1 conversation and present the
  smallest user decision boundary
- **AND** it SHALL NOT start silent research, request a non-material decision, or
  turn acceptance into a false access-success claim

#### Scenario: Direct result remains distinct from Gate verdict

- **WHEN** the Phase Agent has written either returned observation
- **THEN** it SHALL render HIU-002's corresponding result before the existing Gate
- **AND** only a passing Gate SHALL authorize the existing silent-execution exit

### Requirement: Phase setup body completeness and stop semantics

`phase-setup.md` SHALL 包含完整的 9-section body，并保留 `stop: no`。

Section 内容要求：
- **Stage Goal**: 验证 bundle 在进入 wave0 前的 structural consistency
- **Required Inputs**: current run bundle、`shared-profile.md`、`shared-schemas.md`
- **Allowed Actions**:
  - 检查 control files 是否存在且可解析
  - 检查 scaffold dirs 是否存在
  - 检查 HITL1 marker 是否已写入 profile
  - 检查 `rb_status.json` 处于 gate 前窗口 `current_gate: hitl1_recorded` / `next_gate: setup_ready`（HITL1 完成后、进入 setup 时的合法 bootstrap 窗口）；该窗口是 setup gate 的**前置状态**，不是漂移
  - 在运行 setup gate 前，通过 bootstrap 兼容窗口（`hitl1_to_setup`）执行 `advance-status --to setup_ready`，使状态变为 `current_gate: setup_ready` / `next_gate: seed_topics_ready`（这正是 setup gate 的 `status_current_gate` / `status_next_gate` 期望值）；文档不得把 gate 后状态当作 gate 前检查，也不得把 bootstrap advance 描述为「gate pass 之后才执行」
  - 按 accepted normalization 规则检查 bundle dir basename、`rb_plan.md` frontmatter `plan_basename`、`rb_profile.yaml` `plan_basename` 一致
- **Expected Artifacts**: 一致的 pre-wave0 bundle surface
- **Gate Command**: `node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-setup-ready.mjs --bundle <path> --current-node phases/phase-setup.md`
- **On Gate Pass**: 读取 `check.next`（应为 `phases/phase-seed-topics.md`）
- **On Gate Fail**: 读取 `inspect` / `advice`，修复后 rerun；status drift 类 hint 的 repair 命令（`advance-status --to setup_ready`）在 bootstrap 窗口内是合法 engine_operation
- **Stop Behavior**: `stop: no`
- **Anti-Cheating Rules**: 禁止把 setup pass 当 readiness pass；禁止手动改状态冒充 ready

#### Scenario: Setup does not become readiness

- **WHEN** `phase-setup.md` 描述检查范围
- **THEN** body SHALL 明确声明 `setup_ready != readiness_passed`
- **AND** body SHALL 限定在结构一致性，不做研究质量判断

#### Scenario: Setup body explains the bootstrap status window before the gate

- **WHEN** `phase-setup.md` 描述 `rb_status.json` 的检查
- **THEN** body SHALL 说明 gate 前合法窗口是 `current_gate: hitl1_recorded` / `next_gate: setup_ready`
- **AND** body SHALL 指示在运行 setup gate 前执行 `advance-status --to setup_ready`（bootstrap `hitl1_to_setup` 兼容窗口）以到达 gate 期望的 `setup_ready` / `seed_topics_ready`
- **AND** body SHALL NOT 把 `setup_ready` / `seed_topics_ready` 描述为「无需任何前置同步即应存在」的 gate 前状态

#### Scenario: Setup body explains disposable bundle normalization

- **WHEN** `phase-setup.md` 描述 basename consistency
- **THEN** body SHALL 说明 production 使用 `dpt_rb_<name>`，disposable experiment 使用 `dpt_disp_<name>_<hex>`
- **AND** body SHALL 指示 Agent 比较归一化后的 bundle basename 与 plan/profile `plan_basename`

### Requirement: Setup body distinguishes production and disposable naming contracts

`phase-setup.md` SHALL 明确说明当前 accepted name grammar：
- production run logical name 使用 lowercase kebab-case，匹配 `[a-z0-9][a-z0-9-]*`
- disposable experiment logical name 使用 lowercase case slug，匹配 `[a-z0-9][a-z0-9_-]*`

该说明 SHALL 只解释当前 contract，不引入新的命名接口。

#### Scenario: Setup body documents name grammar

- **WHEN** Agent 读取 `phase-setup.md` 的 basename consistency 部分
- **THEN** body SHALL 说明 production 与 disposable 的 `<name>` 允许字符集不同
- **AND** body SHALL NOT 暗示大写、空格或任意 Unicode 是可接受命名

### Requirement: HITL1 body exposes a concrete payload checklist

`phase-hitl1.md` SHALL expose the existing minimum write checklist:
`research_profile`, `root_must_answer_set`, `research_style_params`,
`research_access.status`, one terminal entry per declared direct sample,
the content-only surface category rule, the unavailable summary reason,
and `human_decision_checkpoints.hitl1.status`/`.recorded_at`. The list remains an
alignment/review surface rather than schema authority.

The checklist SHALL identify `rb_profile.yaml#/research_access` as Phase-owned:
the probe agent returns no persisted artifact, and the current observation is a
compact final snapshot with no URL, body, header, status code, candidate, query, raw
tool label, retry, VPN, geolocation, IP, or provider field. A whole no-request relay
observation SHALL be shown as unavailable with every declared sample `not_attempted`
and no surface; a per-sample budget-expired entry uses `round_budget_not_attempted`.
The checklist SHALL note that legacy observations remain readable but are not mixed
with the current direct-sample format.

#### Scenario: Human can audit the isolated observation handoff

- **WHEN** a human reviewer reads `phase-hitl1.md`
- **THEN** the reviewer SHALL see the complete current direct-sample fields, the
  content-only surface rule, and that the Phase Agent, not the probe agent, writes
  the profile
- **AND** review SHALL not require reconstructing a parallel receipt or status protocol

### Requirement: Instantiation scope boundary enforcement

`phase-instantiation.md` SHALL remain limited to naming, invoking the instantiation CLI, and checking the instantiated bundle surface. This requirement narrows how `stop: "no"` instantiation handles name problems: it SHALL resolve ordinary naming problems silently instead of asking the user.

Instantiation completion SHALL mean the instantiated bundle surface has been reloaded, the instantiation gate has passed, and the Agent follows gate CLI `check.next`. Creating the directory or control files is not a user-facing checkpoint. The phase body SHALL NOT allow progress reports such as "bundle created" or idle reports such as "nothing left to do" before the gate pass.

For production bundle name collision, the phase body SHALL instruct the Agent to derive a replacement basename by appending a short deterministic-safe suffix such as `-<hex6>`, record the substitution through an accepted trace/log surface, and continue instantiation without asking the user.

For illegal user-provided basename characters, the phase body SHALL instruct the Agent to normalize the basename into the accepted pattern (for example replacing illegal characters with `-`), record the normalization through an accepted trace/log surface, and continue instantiation without asking the user.

This does not allow unsafe repair of an already-created illegal bundle. The Agent SHALL NOT rename an existing runtime directory, patch `rb_plan.md` / `rb_profile.yaml` to retroactively bless an illegal basename, or treat an invalid existing bundle as valid.

#### Scenario: Name collision uses silent replacement name

- **WHEN** the desired production bundle basename already exists
- **THEN** `phase-instantiation.md` SHALL instruct the Agent to generate a replacement basename with a short suffix
- **AND** the Agent SHALL record the substitution through an accepted trace/log surface
- **AND** the Agent SHALL NOT stop to ask the user for a new name

#### Scenario: Illegal name is normalized before instantiation

- **WHEN** the requested bundle basename contains illegal characters
- **THEN** `phase-instantiation.md` SHALL instruct the Agent to normalize the basename before creating the bundle
- **AND** the Agent SHALL record the normalization through an accepted trace/log surface
- **AND** the Agent SHALL NOT stop to ask the user for a replacement name

#### Scenario: Existing illegal bundle is not retroactively repaired

- **WHEN** Agent discovers an already-created bundle basename that violates the accepted pattern
- **THEN** the Agent SHALL NOT rename the existing directory or patch control files to make it look valid
- **AND** any recovery SHALL use a fresh legal instantiation path

#### Scenario: Instantiation does not surface after local creation

- **WHEN** the instantiation CLI creates a bundle directory and control files
- **THEN** the Agent SHALL reload/check the instantiated surface and run the instantiation gate
- **AND** the Agent SHALL NOT report progress or idle state to the user before gate pass
- **AND** the Agent SHALL advance only via gate CLI `check.next`

### Requirement: HITL1 stop semantics enforcement

`phase-hitl1.md` 的 `stop: yes` SHALL 被正确实现。用户回答后，Agent 仍必须运行 `hitl1-recorded` gate；`stop: yes` 只意味着等待用户，不意味着豁免 deterministic check。

#### Scenario: Stop yes blocks auto-advance

- **WHEN** 用户尚未回答 HITL1
- **THEN** Agent MUST NOT 进入 `phase-setup`

### Requirement: Setup stop semantics enforcement

`phase-setup.md` remains `stop: "no"` and gate pass still auto-advances through gate CLI `check.next`. On persistent setup gate failure, the phase body SHALL no longer instruct user-facing escalation or `rb_status.json` state `blocked`. It SHALL instruct the Agent to record `silent_degradation` through an accepted trace/log surface, preserve `rb_status.json` in an in-progress/non-blocked lifecycle state, and continue repair or gate-respecting degradation without asking the user.

Setup completion SHALL mean `setup-ready` gate pass plus `check.next`, not "validation seems locally complete." If setup work appears complete, the Agent SHALL run the gate and repair from inspect/advice rather than surfacing a status update.

#### Scenario: Setup persistent failure degrades silently

- **WHEN** setup gate has failed repeatedly without progress
- **THEN** the Agent SHALL record `silent_degradation` through an accepted trace/log surface
- **AND** the Agent SHALL NOT write `rb_status.json` state `blocked`
- **AND** the Agent SHALL NOT ask the user or report and stop
- **AND** the Agent SHALL NOT claim setup passed unless the setup gate passes

#### Scenario: Setup local completion runs gate instead of reporting

- **WHEN** setup validation appears locally complete
- **THEN** the Agent SHALL run the `setup-ready` gate
- **AND** the Agent SHALL NOT provide an intermediate progress summary
- **AND** any further action SHALL be driven by gate pass `check.next` or gate fail inspect/advice

### Requirement: Anti-cheating rules in phase bodies

每个 phase node body 的 Anti-Cheating Rules section SHALL 包含该 phase 特有禁令，并 reference `shared-anti-cheating-rules.md`。

#### Scenario: Each phase has phase-specific anti-cheating rules

- **WHEN** Agent 读取任一 pre-research phase 的 Anti-Cheating Rules section
- **THEN** section SHALL 至少列出 2 条 phase-specific 禁令
- **AND** 每条禁令 SHALL 指向正确替代动作

### Requirement: HITL1 captures controls without expanding lifecycle authority

The HITL1 phase body and brief SHALL invite the user to optionally provide
per-run research controls and an optional natural-language research focus, and
SHALL record the resolved control brief in the canonical host-file subsection.
HITL1 SHALL resolve a material conflict with profile, must-answer, style, or
the proposed Topic map through the existing structured owner before it records
both surfaces. The phase SHALL NOT add a profile field, canonical Topic field,
Gate rule, lifecycle state, file-upload checkpoint, background sync, later
silent-wave writer, or focus parser.

When writing the accepted no-controls or supplied-controls form, HITL1 guidance
SHALL direct the Agent to obtain exact text from the existing pure
`plan-hostfile-sections` renderer, then write that returned text only to the
already Agent-owned `rb_plan.md## Constraints > ### User Research Controls`
coordinate. When an accepted focus exists, the literal source passed to that
renderer SHALL include the user's verbatim focus wording and separately
labelled current Agent interpretation. The renderer remains a presentation
helper, not a host-file writer, focus parser, Topic-state input authority,
profile writer, or Gate authority. If its public command surface is unavailable
or rejects its invocation, guidance SHALL expose that missing-contract or direct
invocation boundary; it SHALL not tell the Agent to imitate a shorter fence,
invent an alternative rendering protocol, or bypass the existing owner.

#### Scenario: material conflict is decided before silent work
- **WHEN** a proposed control or focus materially conflicts with profile,
  must-answer, style, or approved Topic semantics
- **THEN** HITL1 obtains the one needed user decision and updates the existing
  structured owner where necessary
- **AND** later phases do not choose an implicit winner or mutate profile facts
  from the prose brief

#### Scenario: HITL1 uses the reachable controls renderer without widening authority
- **WHEN** a resolved HITL1 controls/focus decision is ready for durable capture
- **THEN** the Agent SHALL use the documented pure renderer and write its
  returned section at the existing host-file coordinate before topic-state apply
- **AND** it SHALL not treat renderer output as profile, Gate, lifecycle, Topic
  state, or focus-coverage authority

#### Scenario: no-controls behavior remains current behavior
- **WHEN** user provides no optional research controls or focus
- **THEN** HITL1 SHALL write the existing exact no-controls form through the
  same renderer and continue the existing accepted topic/profile path
- **AND** it SHALL NOT add a focus-related prompt, state, Gate, or follow-up
  merely because no focus was supplied

### Requirement: Research phases consume the original host-file coordinate

Seed Topics, Wave0, Wave1, Wave2 and Final guidance SHALL tell the Agent to read the original user-controls coordinate when controls are present, alongside existing profile, topic and verified evidence inputs. Seed MAY author topic-local `search_guardrails` and `evidence_route` projections, but those projections SHALL NOT replace the original brief. Final SHALL make a material unfulfilled control or evidence limitation visible rather than silently pretending it was satisfied.

#### Scenario: no-controls behavior remains current behavior
- **WHEN** the explicit no-controls form or legacy absence applies
- **THEN** Seed, Wave, and Final retain current guidance without a copied empty brief or added control-specific work

### Requirement: HITL1 capture precedes canonical topic-state replacement

After the alignment draft and any material-conflict resolution are complete, HITL1
SHALL write the required alignment snapshot and the exact URC-001 no-controls or
supplied-controls form to `rb_plan.md` before it creates the retained input for
`operate-topic-state apply`. When a focus is accepted, that form includes the
existing literal user-wording and Agent-interpretation convention. The alignment
snapshot remains a separate template-owned Goal subsection; it SHALL NOT be folded
into, or alter the compatibility meaning of, `### User Research Controls`.

The existing canonical topic-state transaction SHALL then preserve that current
host-file body while refreshing its frontmatter and Topic Registry presentation.
Neither the alignment snapshot nor controls snapshot SHALL be copied into the
topic-state input schema, Topic identity, seed identity, profile, Gate, or Engine
authority fields.

If topic-state apply returns an accepted workspace or recovery boundary, the Agent
SHALL use its existing exact inspect/recover/apply operation. It SHALL retain and
read the already-durable host-file snapshots; it SHALL NOT reconstruct alignment,
controls, or focus from chat memory, reread an external source path, or ask the user
to repeat a decision whose snapshot remains readable. A legacy bundle without the
new template-owned alignment subsection remains readable; this requirement creates
no migration or inferred historical intent.

#### Scenario: canonical topic-state apply preserves captured snapshots

- **WHEN** HITL1 captures an alignment snapshot and a valid supplied-controls
  snapshot containing an accepted focus, then applies approved canonical topics
- **THEN** the committed `rb_plan.md` retains the alignment snapshot and exact
  controls form while its Topic Registry is refreshed
- **AND** neither snapshot appears in topic-state input, profile, seed identity, or
  Engine authority fields

#### Scenario: topic-state recovery does not lose snapshots

- **WHEN** topic-state apply leaves an accepted recovery workspace after alignment,
  controls, or focus were captured
- **THEN** recovery uses the existing workspace owner
- **AND** the active or recovered host file retains the durable snapshots without an
  external-path reread or repeated user decision

### Requirement: HITL1 body routes structural topic re-adjustment through the complete layout target

`phase-hitl1.md` SHALL instruct that, after a first approved canonical topic change set has committed inside the legal HITL1 window, a user-directed structural re-adjustment — splitting one committed topic into several, removing a no-longer-wanted topic, reordering, renumbering, or correcting a misleading slug stem — SHALL be applied by submitting one complete `mutate_layout` target through the same existing `operate-topic-state apply` within the same `hitl1_recorded -> setup_ready` window, based on the copy-ready `inspect` layout baseline. The body SHALL state that the user owns title/order/remove semantics while the Agent owns the mechanical target edits, the retained input, and apply/recover execution, and that safe-remove history/dependency checks, `expected_plan_sha256`, and the atomic prepared workspace are Engine-owned boundaries.

The body SHALL NOT instruct direct editing of `rb_plan.md` topic-registry frontmatter, seed files, or seed frontmatter to achieve structural re-adjustment, and SHALL NOT present degrading a removed topic's title or scope role into a stale placeholder as the removal path. A committed layout target that changes registry length SHALL be followed by consuming the returned style-projection handoff through the existing `apply-research-style.mjs` owner before the `hitl1-recorded` gate.

#### Scenario: Split-topic re-adjustment commits through legal sequential applies

- **WHEN** the user asks to split one committed combined topic into independent topics during the same HITL1 window
- **THEN** the body's path SHALL keep the apply forms unmixed: one apply commits the replacement `add_topic` change set, and a subsequent apply submits one complete `mutate_layout` target that removes the combined UID and reorders/renumbers, carrying `expected_plan_sha256` from a fresh post-add inspect
- **AND** Engine derives continuous ids/slugs, cleans superseded seed files atomically, and the body SHALL NOT instruct hand-editing registry frontmatter, seed file names, or seed frontmatter

#### Scenario: Window closure ends HITL1 layout authority

- **WHEN** the `hitl1-recorded` gate has passed and the bundle has advanced beyond the `hitl1_recorded -> setup_ready` window
- **THEN** the same structural request SHALL no longer be legal in HITL1 and the body SHALL point to the sanctioned rerun path, or a new bundle for already-researched topics
- **AND** the closed window SHALL NOT be reopened by caller-declared context or `human-directed` wording

#### Scenario: Style handoff follows a length-changing HITL1 layout commit

- **WHEN** a HITL1 layout target changes canonical registry length
- **THEN** the phase body SHALL consume the returned style-projection handoff through the existing style CLI before running the `hitl1-recorded` gate
- **AND** it SHALL NOT hand-compute or hand-write style parameters

### Requirement: HITL1 uses the selected semantic research-access adapter

HITL1 SHALL use the current executor's already available and permitted
direct-page-retrieval surface for the isolated controller-declared sample URLs. This
is an execution fact, not a selected provider adapter. The selected Claude adapter
may remain an executor-scoped experiment contract but SHALL not be a production
HITL1 dependency, a condition for Codex, or an authority to permit a retrieval.

The Phase SHALL deliver only the generic isolated-probe guide and the independent
controller to the probe. The probe may use a native/built-in, browser, Node, or
independently permitted shell retrieval surface according to the controller's
bounded rules and actual current host permission. Missing permission or an unavailable
surface is recorded honestly; it does not direct the user to run commands or create
a fallback beyond the controller.

This phase content SHALL NOT grant provider permission, ask the user to run the
pipeline, hand-edit `research_access`, add a HITL checkpoint, or write a parallel
adapter/status record. It SHALL keep probe output outside research evidence surfaces.

#### Scenario: Current executor has a legal direct surface

- **WHEN** the current Coding Agent can legally retrieve one declared sample URL
- **THEN** the isolated probe SHALL use that direct surface under the controller
- **AND** the Phase retains the only profile-write and Gate-run authority

#### Scenario: Current executor has no legal direct surface

- **WHEN** every permitted direct retrieval surface is unavailable or denied
- **THEN** the controller SHALL return its bounded current observation honestly
- **AND** the Phase SHALL use the ordinary material-gap conversation rather than
  asking the user to fabricate data, run a command, or select another provider

### Requirement: Research phases SHALL consume baseline and current accepted amendments without reconstructing chat

Seed Topics, Wave0, Wave1, Wave2, and Final guidance SHALL use the original
User Research Controls coordinate as the HITL1 baseline when controls are
present. For a rerun created under the current contract, guidance SHALL also
read the newest complete `rb_plan.md## Decisions` revision whose target count
matches the current accepted rerun count, plus each affected Topic's matching
current direction where that Topic is being acted on. Older revisions and
stale/future/invalid directions remain history or repair context, not current
instructions.

Seed Topics SHALL project baseline controls into existing topic-local
enrichment/body whenever they materially affect that Topic. Wave and Final
guidance SHALL read the source coordinates in addition to their existing
profile, Topic, evidence, coverage, and delivery inputs; a derived projection
SHALL NOT replace its source. No-controls, no-rerun, and readable legacy bundles
without Decisions revisions SHALL preserve their existing paths without copied
empty context, inferred history, or a new blocking Gate.

#### Scenario: Initial run consumes only applicable baseline intent

- **WHEN** HITL1 controls materially constrain one Topic but not another
- **THEN** Seed guidance SHALL project only the applicable constraint into the affected Topic's existing authoring surface
- **AND** later phases SHALL retain the original controls coordinate as the baseline source

#### Scenario: Rerun consumes current revision rather than historical union

- **WHEN** the current count is 2 and Decisions contains complete revisions for rounds 1 and 2
- **THEN** Wave and Final guidance SHALL combine the baseline with round 2's complete active amendments
- **AND** round 1 SHALL remain visible history but SHALL NOT independently reactivate withdrawn work

#### Scenario: Legacy missing revision remains readable

- **WHEN** an already-existing readable rerun bundle has profile/direction facts but no Decisions revision
- **THEN** the existing compatibility path SHALL remain readable
- **AND** no phase SHALL fabricate an amendment history from old artifacts, direction prose, or filenames
