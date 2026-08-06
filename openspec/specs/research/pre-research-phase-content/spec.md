# Pre-Research Phase Content

> req: PRP-001, PRP-002, PRP-003, PRP-004, PRP-005, PRP-006, PRP-007, PRP-008, PRP-009, PRP-010, PRP-011, PRP-012, PRP-013, PRP-014, PRP-015

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

`phase-hitl1.md` SHALL contain the complete 9-section body, retain `stop: yes`, and declare `execution_contract.search_policy: capability_probe_only`.

Section requirements:

- **Stage Goal**: turn the original question into one Agent-recommended research starting point, accept the user's natural-language acceptance or correction, confirm actual research access, and commit approved canonical topic intent.
- **Required Inputs**: instantiated bundle and `shared-profile.md`.
- **Allowed Actions**:
  - read the original research question/brief and decide whether topic rewrite is needed;
  - write structured original-topic narrative to `rb_plan.md` body without inventing missing user constraints;
  - derive an Agent-facing preview of initial topics, proposed must-answer set, and one recommended research profile/depth/breadth with a reason and expected effort impact;
  - show original topic + topic preview + recommendation-first HITL1 alignment surface to the user and wait for a natural-language acceptance, correction, question, or optional shortcut choice;
  - consume the existing HITL1 entry path and establish `current_node: phases/phase-hitl1.md` before topic mutation; only inside its accepted decision window, map the user's clear acceptance or correction to existing profile/topic fields and never treat ordinary later chat as persisted HITL1 intent or mutation authority;
  - when the user's semantics are clear, treat that answer as confirmation and do not require a blanket second confirmation; ask only the minimum question needed for substantive ambiguity, real cost/permission expansion, or irreversible risk;
  - select the `research_profile` enum and write `root_must_answer_set` from the accepted recommendation/correction;
  - write `human_decision_checkpoints.hitl1.status` and `.recorded_at`;
  - after that semantic decision is recorded, invoke the existing `advance-status --to hitl1_recorded`, consume its successful bootstrap-compatible status output, and establish `current_gate: hitl1_recorded` / `next_gate: setup_ready` before any topic-state apply; the Agent SHALL not hand-edit status or use a failed Gate to discover this order;
  - only after that existing status synchronization succeeds, write a retained topic-state input file containing `add_topic` entries with title, descriptive slug stem, must-answer set, scope role and dependencies, then run one existing `operate-topic-state apply` change set so the approved canonical registry and all UID-bound seed skeletons commit together; do not directly write registry frontmatter or defer approved intent to the seed phase;
  - read the committed topic-state result; when it exposes a `style_projection` handoff after a registry-length change, run its exact existing `apply-research-style.mjs` command using the selected profile and committed registry count, then rerun the named HITL1 Gate; a no-length-change result SHALL not create a style operation;
  - render the exact pre-probe template owned by `brief/hitl1.md` and HIU-002, then execute one fixed neutral capability-only search using `site:wikipedia.org "Internet protocol suite"`, consider at most the first three syntactically eligible actual HTTP(S) candidates in returned order, and process them serially through the bounded native-first/same-URL fallback sequence described below. Record one final direct `research_access` observation;
  - immediately after that final `available` or `unavailable` observation, render the corresponding exact result template owned by HIU-002, then run the existing HITL1 Gate. The direct result SHALL NOT claim that the Gate has passed or failed; the existing silent-execution exit remains Gate-pass-only.
- **Expected Artifacts**: canonical `rb_plan.md` registry, matching UID-bound seeds, and `rb_profile.yaml` containing user choices, style parameters, HITL1 marker and research-access observation.
- **Gate Command**: existing `check-gate-hitl1-recorded.mjs` under the current node.
- **On Gate Pass**: read `check.next` and present HIU-002's existing silent-execution exit only after the Gate passes.
- **On Gate Fail**: read inspect/advice, follow an existing legal repair or returned owner/terminal/missing-contract boundary, and rerun the same operation or Gate when that path exists. An unavailable access result has no Setup/Wave advance path; it preserves recorded choices and exposes only the smallest unavailable permission or external-environment boundary.
- **Stop Behavior**: wait for the user's research semantic decision at HITL1; a clear acceptance or correction satisfies that human decision boundary, after which Agent executes ordinary status-sync/apply/style/probe/Gate commands without returning each mechanical step to the user. Only a new host permission, unavailable legal surface, or non-delegable external environment action returns the smallest boundary to the user.
- **Anti-Cheating Rules**: no chat-only answers, fake probe, direct registry edit, seed-only identity, mock access, parallel status tree, automatic retry tree, invented user semantics, or treating non-HITL chat as HITL1 mutation authority.

The probe SHALL make exactly one search invocation using the literal neutral query `site:wikipedia.org "Internet protocol suite"`. A syntactically eligible candidate is an actual HTTP(S) result returned by that search, in returned order, which has no raw single quote, ASCII whitespace/control character, or URL credentials and does not target `localhost`/`.localhost`, loopback, or a literal private/link-local address. The Agent SHALL consider no more than the first three such candidates and SHALL not invent, normalize, substitute, or retain a query/URL history.

For each considered candidate, the Agent SHALL use the available native fetch surface first. Only when the native surface is absent before invocation or its one attempt returns no real page content because it is blocked, unavailable, or failed, and independently configured host shell/network permission permits the exact action and target, the Agent MAY use at most one existing standalone shell `curl --fail --silent --show-error --location --max-time 15 --max-redirs 5 --proto '=http,https' --proto-redir '=http,https' --globoff -- '<same-url>'` fallback. It SHALL contain no prefix assignment, pipe, redirection, command substitution, shell chaining, or trailing command. The initial request and at most five redirects SHALL remain HTTP(S)-only, curl URL globbing SHALL be disabled, and host DNS/network policy SHALL remain authoritative for resolved and redirected destinations. A native success or permitted fallback success with real requested page content SHALL end the entire probe. The Agent SHALL advance to the next eligible candidate only after the current candidate's permitted bounded sequence cannot return real content. If the current candidate reaches a permission, absent-surface, or other no-legal-path boundary, the probe SHALL stop at that candidate; it SHALL not silently skip to a later result. The Agent SHALL not repeat either surface, add another fallback tier, run another search, or persist an automatic retry tree.

The current HITL1 writer SHALL record `eligible_candidate_count` from `0` through `3` for candidates actually considered and, when that count is positive, `final_candidate_ordinal` from `1` through that count for the final considered candidate. A positive-count observation SHALL retain that one final considered `result_url`, whether its branch fetches, succeeds, fails, or stops because no legal fetch surface is available. Search unavailable/failed/blocked or no syntactically eligible candidate SHALL record `unavailable` with `fetch_outcome: not_attempted`, candidate count `0`, no ordinal, and no URL. A successful native or fallback fetch SHALL record `available`, the searched `result_url`, `fetch_outcome: success`, the actual successful `fetch_surface`, and candidate metadata. If every permitted candidate attempt returns no real page content, the Agent SHALL record `unavailable`, the final `result_url`, the final actual non-success `fetch_outcome`, the final attempted `fetch_surface` when known, bounded candidate metadata, and one bounded direct reason without adding attempt-history fields. If the selected candidate reaches a no-legal-path boundary before any fetch invocation, the Agent SHALL record `unavailable`, that candidate's `result_url`, `fetch_outcome: not_attempted`, positive candidate metadata, and the direct no-path reason. If native fetch was invoked and returned no real content before an unavailable fallback boundary, the observation SHALL instead retain that actual native `failed` or `blocked` outcome and its `fetch_surface`. Only real fetched page content permits `available`; command exit success, an empty body, a search snippet, or an HTTP error/challenge shell without the requested page content SHALL NOT suffice.

The Phase Agent SHALL use the direct `research_access.status` observation only to select HIU-002's corresponding result template. It SHALL render that template after the observation and before the same HITL1 Gate; it SHALL not make the result a Gate verdict, reopen the recorded HITL1 decision, or announce silent autonomous execution before the Gate passes. The template is framework Markdown only and SHALL NOT claim authority over selected-host-native tool calls, policy failures, transport/security errors, or permitted shell output.

Native fetch policy failure SHALL NOT itself authorize shell/network access or a policy bypass. When independently configured host shell/network permission already permits the exact alternative fetch invocation and target, fallback SHALL be Agent-owned mechanical execution. The Agent SHALL NOT silently widen project configuration, ask the user to run `curl`, acknowledge the failure, or confirm continuation before trying it. If `curl` is absent, blocked by host policy, requires permission the Agent does not have, targets an ineligible URL, or also fails, the Agent SHALL preserve accepted HITL1 semantic choices, record the honest unavailable observation, render HIU-002's unavailable result, and expose only the smallest permission or external-environment prerequisite before rerunning this same probe and Gate. User approval alone SHALL NOT convert failed or missing page content into a successful observation.

Probe URL/content SHALL NOT become research evidence, cache, submitted output, receipt or gate coverage. HITL1 SHALL NOT create offline research artifacts, fake probe receipts, evidence-free report skeletons, automatic retry trees or another interactive checkpoint. User choices and research access SHALL remain in the accepted profile surface, not a parallel status tree.

HITL1 natural-language mapping SHALL be a prompt-side Agent responsibility within the existing `stop: yes` boundary, not a new Engine authority or generic conversation interceptor. It SHALL NOT persist, queue, or apply a user's voluntary message from a later `stop: no` phase, and SHALL NOT create pause, reentry, permission or mutation capability.

HITL1 gate SHALL require `CanonicalPlanSchema`, exact UID-bound seed projection and completed topic-state workspace state. Legacy-compatible plan readability SHALL not count as HITL1 completion. The Agent SHALL run the existing gate after user input; `stop: yes` does not waive deterministic checks.

Initial topic-state apply SHALL run only after `enter-phase` has populated `rb_status.json#/current_node: phases/phase-hitl1.md` and the existing bootstrap-compatible status synchronization has established `current_gate: hitl1_recorded` / `next_gate: setup_ready`. The apply context argument is descriptive only; it SHALL NOT authorize mutation when those direct lifecycle facts are absent or stale.

#### Scenario: HITL1 uses the style handoff after topic materialization

- **WHEN** the accepted HITL1 topic-state operation commits a registry whose length changes
- **THEN** the Phase Agent SHALL consume the returned `style_projection` handoff through the existing style CLI before `check-gate-hitl1-recorded.mjs`
- **AND** it SHALL treat a freshness failure as one mechanical same-Gate repair, not as a new user decision or direct profile edit

#### Scenario: User approves initial topics and Agent materializes them
- **WHEN** HITL1 has presented a complete recommendation and the user answers “按这个开始” or otherwise clearly approves the proposed topic semantics
- **THEN** the Agent SHALL treat that answer as confirmation, write retained apply input and immediately run topic-state apply
- **AND** it SHALL NOT ask the user to repeat the same choice through a letter menu or second confirmation
- **AND** canonical registry plus UID-bound seeds SHALL commit before style computation and gate pass

#### Scenario: User corrects the recommendation and Agent preserves the rest
- **WHEN** the user clearly corrects one part of the recommendation, such as “范围不变，但重点放资本约束”
- **THEN** the Agent SHALL update the affected proposed topic/must-answer semantics and preserve the uncorrected parts
- **AND** it SHALL NOT invent additional constraints or require another confirmation when the corrected intent is clear
- **AND** it SHALL perform retained apply, style, probe and Gate mechanics itself

#### Scenario: HITL1 keeps user responsibility semantic
- **WHEN** topic intent is clear from the user's acceptance or correction
- **THEN** the Agent SHALL run apply/style/probe/fallback/gate without asking the user to execute commands
- **AND** it SHALL not ask the user to confirm the same clear semantics again
- **AND** it SHALL ask again only for genuinely unresolved semantics, real cost/permission expansion or irreversible risk

#### Scenario: Status synchronization precedes canonical topic-state apply

- **WHEN** recorded HITL1 semantics have produced a retained topic-state input
- **THEN** the Agent SHALL invoke the existing `advance-status --to hitl1_recorded` and consume its success before `operate-topic-state apply`
- **AND** a failed synchronization SHALL leave canonical topic state unchanged and direct the Agent to the existing legal operation or no-path boundary
- **AND** the Agent SHALL NOT edit `rb_status.json`, use a force/context bypass, or first run the HITL1 Gate to discover the required order

#### Scenario: Declared HITL1 context is not mutation authority
- **WHEN** an apply request declares HITL1 but `current_node` or the accepted HITL1 status window does not match
- **THEN** apply SHALL reject before workspace creation without changing plan, seed, profile, status or trace
- **AND** the Agent SHALL restore or re-enter the existing legal lifecycle path rather than request a bypass

#### Scenario: Plan-first crash fails at one prerequisite
- **WHEN** an accepted topic-state workspace remains after plan replacement and before seed completion
- **THEN** HITL1 gate SHALL report the workspace/seed prerequisite and exact recover action
- **AND** SHALL short-circuit derivative profile/count/seed-floor symptoms

#### Scenario: Fixed neutral query follows the pre-probe notice
- **WHEN** HITL1 has completed all existing prerequisites before the research-access probe
- **THEN** the Phase Agent SHALL render HIU-002's exact pre-probe notice before its one native search invocation
- **AND** that invocation SHALL use exactly `site:wikipedia.org "Internet protocol suite"`
- **AND** the Phase Agent SHALL derive eligible candidates only from that invocation and preserve the existing bounded probe sequence

#### Scenario: Available observation is explained before the Gate
- **WHEN** the one bounded probe records `research_access.status: available`
- **THEN** the Phase Agent SHALL render HIU-002's exact available result directly after recording that observation and before `check-gate-hitl1-recorded.mjs`
- **AND** it SHALL NOT announce the existing silent autonomous execution until the Gate passes
- **AND** it SHALL preserve the observation and Gate as separate owners

#### Scenario: Unavailable observation keeps its existing authority path
- **WHEN** the one bounded probe records `research_access.status: unavailable`
- **THEN** the Phase Agent SHALL render HIU-002's exact unavailable result directly after recording that observation and preserve the existing observation and HITL1 Gate owners
- **AND** it SHALL preserve recorded choices and the same-probe/Gate repair path
- **AND** it SHALL NOT add a query history, new state, Gate, retry tree, provider fallback, or host-output suppression promise

#### Scenario: First selected candidate succeeds natively
- **WHEN** actual search returns a syntactically eligible HTTP(S) candidate and its available native fetch returns real page content
- **THEN** HITL1 SHALL record the available observation with `eligible_candidate_count: 1`, `final_candidate_ordinal: 1`, and the native `fetch_surface`
- **AND** it SHALL not invoke `curl`, consider a second candidate, or count probe output as evidence

#### Scenario: Native fetch block uses one same-URL fallback
- **WHEN** actual search returns an eligible HTTP(S) URL and native fetch is absent, blocked, unavailable or fails without real page content
- **AND** independently configured host permission permits the exact shell/network action
- **THEN** the Agent SHALL invoke `curl` at most once for that same URL without asking the user to operate the pipeline
- **AND** real page content SHALL produce the existing available observation with `fetch_surface: curl`

#### Scenario: Earlier blocked candidates do not hide a later bounded success
- **WHEN** one search returns at least three syntactically eligible HTTP(S) candidates in order, the first two complete their permitted bounded sequences without real page content, and the third returns real page content
- **THEN** HITL1 SHALL record one available observation for the third candidate with `eligible_candidate_count: 3` and `final_candidate_ordinal: 3`
- **AND** it SHALL not persist the first two URLs, response bytes, or an attempt history

#### Scenario: Exhausted bounded candidates remain at HITL1
- **WHEN** actual search yields up to three syntactically eligible HTTP(S) candidates but every permitted sequence returns no real page content
- **THEN** HITL1 SHALL record one unavailable observation for the final considered URL with bounded candidate metadata and direct reason, preserve user choices, and remain in HITL1
- **AND** it SHALL NOT select a fourth URL, add a fetch tier, persist retry history, or claim access is available

#### Scenario: Missing permission exposes only the smallest boundary
- **WHEN** native fetch cannot return page content and invoking the only fallback requires a host permission the Agent does not have
- **THEN** the Agent SHALL record an honest unavailable observation and ask only for that permission or external action
- **AND** after the boundary is resolved, the Agent SHALL resume the same bounded probe and Gate mechanics itself

#### Scenario: No eligible target is not sent to shell fallback
- **WHEN** no search result is syntactically eligible because the returned HTTP(S) results target `localhost`, loopback, or literal private/link-local addresses
- **THEN** HITL1 SHALL record the no-candidate unavailable/not-attempted observation with count zero
- **AND** native rejection or user approval SHALL NOT authorize a `curl` attempt to that target

#### Scenario: Shell-unsafe URLs are not interpolated
- **WHEN** every returned HTTP(S) result contains a raw single quote, ASCII whitespace/control character, or URL credentials
- **THEN** HITL1 SHALL treat the search as having no eligible result rather than escape, normalize, or substitute a URL
- **AND** it SHALL NOT construct a double-quoted, piped, redirected, chained or command-substituting fallback

#### Scenario: Available access uses real probe only
- **WHEN** actual search returns an eligible HTTP(S) URL and an allowed native or fallback fetch returns real page content
- **THEN** HITL1 SHALL record the accepted available observation and SHALL NOT count probe output as evidence

#### Scenario: Unavailable access remains at HITL1
- **WHEN** search or every permitted bounded fetch is absent, blocked, fails or returns no usable page content
- **THEN** HITL1 SHALL record the unavailable observation, preserve user choices and remain in HITL1

#### Scenario: HITL1 writes accepted surfaces not status tree
- **WHEN** HITL1 records topic intent, user choices and capability observation
- **THEN** identity/intent SHALL be in canonical plan+seed and choices/access SHALL be in `rb_profile.yaml`
- **AND** HITL1 SHALL NOT create `rb_status.json#/phases/hitl1/*` or another research-access/topic status tree

#### Scenario: Ordinary mid-run message cannot reuse HITL1 mapping authority
- **WHEN** a user voluntarily sends a message while a later `stop: no` phase is executing
- **THEN** PRP-002 SHALL NOT authorize writing that message into HITL1 profile/topic owners or running topic-state mutation from the message alone
- **AND** the message SHALL NOT create a new HITL checkpoint, permission source, pause state or interrupt lifecycle

### Requirement: Phase setup body completeness and stop semantics

`phase-setup.md` SHALL 包含完整的 9-section body，并保留 `stop: no`。

Section 内容要求：
- **Stage Goal**: 验证 bundle 在进入 wave0 前的 structural consistency
- **Required Inputs**: current run bundle、`shared-profile.md`、`shared-schemas.md`
- **Allowed Actions**:
  - 检查 control files 是否存在且可解析
  - 检查 scaffold dirs 是否存在
  - 检查 HITL1 marker 是否已写入 profile
  - 检查 `rb_status.json` 仍然是 `current_gate: setup_ready` / `next_gate: seed_topics_ready`
  - 按 accepted normalization 规则检查 bundle dir basename、`rb_plan.md` frontmatter `plan_basename`、`rb_profile.yaml` `plan_basename` 一致
- **Expected Artifacts**: 一致的 pre-wave0 bundle surface
- **Gate Command**: `node DEEP_RESEARCH_HARNESS/cli/gates/check-gate-setup-ready.mjs --bundle <path> --current-node phases/phase-setup.md`
- **On Gate Pass**: 读取 `check.next`
- **On Gate Fail**: 读取 `inspect` / `advice`，修复后 rerun
- **Stop Behavior**: `stop: no`
- **Anti-Cheating Rules**: 禁止把 setup pass 当 readiness pass；禁止手动改状态冒充 ready

#### Scenario: Setup does not become readiness

- **WHEN** `phase-setup.md` 描述检查范围
- **THEN** body SHALL 明确声明 `setup_ready != readiness_passed`
- **AND** body SHALL 限定在结构一致性，不做研究质量判断

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

`phase-hitl1.md` SHALL expose the minimum write contract as a visible checklist for the human and Agent.

The checklist SHALL include:

- `research_profile`
- `root_must_answer_set`
- `research_style_params`
- `research_access.status`
- `research_access.eligible_candidate_count` and, for a positive count, `research_access.final_candidate_ordinal`
- available path: `research_access.probed_at`, `research_access.result_url`, `research_access.fetch_outcome: success`
- unavailable path: `research_access.probed_at`, non-success `research_access.fetch_outcome`, `research_access.reason`
- `human_decision_checkpoints.hitl1.status`
- `human_decision_checkpoints.hitl1.recorded_at`

Only an unavailable no-candidate branch MAY show count zero without an ordinal or URL; a positive-count observation SHALL retain the final considered URL. Optional `research_access.search_surface` and `research_access.fetch_surface` labels MAY appear in the checklist but SHALL NOT be presented as gate-required facts. The checklist is an alignment/review surface, not a separate schema authority.

#### Scenario: Human can audit capability readiness

- **WHEN** a human reviewer reads `phase-hitl1.md`
- **THEN** the reviewer SHALL see both the normal HITL1 payload and exact available/unavailable observation fields
- **AND** review SHALL not require reconstructing the probe contract from scattered prose

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

The HITL1 phase body and brief SHALL invite the user to optionally provide per-run research controls and SHALL record the resolved control brief in the canonical host-file subsection. HITL1 SHALL resolve a material conflict with profile, must-answer, or style through the existing structured owner before it records both surfaces. The phase SHALL NOT add a profile field, Gate rule, lifecycle state, file-upload checkpoint, background sync, or later silent-wave writer for the controls.

When writing the accepted no-controls or supplied-controls form, HITL1 guidance
SHALL direct the Agent to obtain exact text from the existing pure
`plan-hostfile-sections` renderer, then write that returned text only to the
already Agent-owned `rb_plan.md## Constraints > ### User Research Controls`
coordinate. The renderer is a presentation helper, not a host-file writer or
topic-state input authority. If its public command surface is unavailable or
rejects its invocation, guidance SHALL expose that missing-contract or direct
invocation boundary; it SHALL not tell the Agent to imitate a shorter fence,
invent an alternative rendering protocol, or bypass the existing owner.

#### Scenario: material conflict is decided before silent work
- **WHEN** a proposed control materially conflicts with profile or must-answer meaning
- **THEN** HITL1 obtains the one needed user decision and updates the existing structured owner where necessary
- **AND** later phases do not choose an implicit winner or mutate profile facts from the prose brief

#### Scenario: HITL1 uses the reachable controls renderer without widening authority

- **WHEN** a resolved HITL1 controls decision is ready for durable capture
- **THEN** the Agent SHALL use the documented pure renderer and write its
  returned section at the existing host-file coordinate before topic-state apply
- **AND** it SHALL not treat renderer output as profile, Gate, lifecycle, or
  topic-state input authority

### Requirement: Research phases consume the original host-file coordinate

Seed Topics, Wave0, Wave1, Wave2 and Final guidance SHALL tell the Agent to read the original user-controls coordinate when controls are present, alongside existing profile, topic and verified evidence inputs. Seed MAY author topic-local `search_guardrails` and `evidence_route` projections, but those projections SHALL NOT replace the original brief. Final SHALL make a material unfulfilled control or evidence limitation visible rather than silently pretending it was satisfied.

#### Scenario: no-controls behavior remains current behavior
- **WHEN** the explicit no-controls form or legacy absence applies
- **THEN** Seed, Wave, and Final retain current guidance without a copied empty brief or added control-specific work

### Requirement: HITL1 capture precedes canonical topic-state replacement

After the user decision and any material-conflict resolution are complete, HITL1 SHALL write the exact URC-001 no-controls or supplied-controls form to `rb_plan.md` before it creates the retained input for `operate-topic-state apply`. The existing canonical topic-state transaction SHALL then preserve that current host-file body while refreshing its frontmatter and Topic Registry presentation. The controls snapshot SHALL NOT be copied into the topic-state input schema or seed identity fields.

If topic-state apply returns an accepted workspace or recovery boundary, the Agent SHALL use its existing exact inspect/recover/apply operation. It SHALL retain and read the already-durable host-file snapshot; it SHALL NOT reconstruct controls from chat memory, reread an external source path, or ask the user to repeat a decision whose snapshot remains readable.

#### Scenario: canonical topic-state apply preserves captured controls
- **WHEN** HITL1 captures a valid supplied-controls snapshot and then applies approved canonical topics
- **THEN** the committed `rb_plan.md` retains the exact controls form while its Topic Registry is refreshed
- **AND** the snapshot does not appear in topic-state input, profile, seed identity, or Engine authority fields

#### Scenario: topic-state recovery does not lose a snapshot
- **WHEN** topic-state apply leaves an accepted recovery workspace after controls were captured
- **THEN** recovery uses the existing workspace owner
- **AND** the active or recovered host file retains the durable controls snapshot without an external-path reread or repeated user decision

### Requirement: HITL1 uses the selected semantic research-access adapter

After the user has supplied or confirmed HITL1 research semantics, the HITL1 phase
body SHALL direct the Agent to read the one selected research-access adapter contract
before the existing bounded probe. When that contract supplies an already authorized
operation, the Agent SHALL carry out the ordinary search/fetch mechanics itself and
record the existing direct profile observation. When it supplies no legal operation,
the phase SHALL retain recorded user semantics, write the honest unavailable branch,
and expose only the adapter's direct external boundary before rerunning the same probe
and Gate.

This phase content SHALL NOT grant provider permission, ask the user to run the
pipeline, hand-edit `research_access`, add a HITL checkpoint, or write a parallel
adapter/status record. It SHALL keep probe output outside research evidence surfaces.

#### Scenario: Agent executes an already authorized adapter operation

- **WHEN** the selected adapter declares a legal search and same-URL fetch surface
- **THEN** the Agent SHALL execute the bounded probe after the existing HITL1
  semantic decision without seeking a second user confirmation
- **AND** it SHALL record the direct result through the existing profile owner and
  rerun the existing HITL1 Gate

#### Scenario: Selected adapter is absent

- **WHEN** the selected adapter has no callable search/fetch surface in the current host
- **THEN** the phase SHALL report the `surface_absent` boundary without
  asking the user to fabricate profile data or execute `curl`
- **AND** it SHALL preserve the current HITL1 user decision and remain at HITL1
