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

`phase-hitl1.md` SHALL contain the complete 9-section body, retain `stop: yes`,
and declare `execution_contract.search_policy: capability_probe_only`.

Its Stage Goal, Required Inputs, topic recommendation, natural-language HITL1
mapping, status synchronization, canonical topic-state apply, style handoff,
Expected Artifacts, Gate Command, Gate pass/fail handling, Stop Behavior, and
Anti-Cheating Rules SHALL retain the accepted behavior. A clear user decision
still returns ordinary apply/style/probe/Gate mechanics to the Phase Agent;
ordinary later chat SHALL not become HITL1 intent or mutation authority.

After the required style handoff, the Phase Agent SHALL render HIU-002's exact
pre-probe notice, load one dedicated probe-agent guidance surface, and spawn
one bounded probe agent with that generated prompt. The Phase Agent SHALL NOT
directly invoke search or fetch. The prompt SHALL carry the exact neutral query
`site:wikipedia.org "Internet protocol suite"`, the existing candidate and
native-first/same-URL fallback bounds, and one compact return-map contract.
The probe agent SHALL not read or write a run bundle, profile, status, trace,
receipt, ledger, work-unit output, cache, artifact, reference, or Gate.

The return map SHALL be exactly one existing `research_access` observation
branch. The Phase Agent remains the only writer of `rb_profile.yaml` and SHALL
write a returned valid observation unchanged before rendering the corresponding
HIU-002 result and running the existing `check-gate-hitl1-recorded.mjs`.
Spawn failure, no return, or a return that does not satisfy an existing branch
SHALL produce an honest `unavailable` observation with a direct non-empty
reason. This path preserves recorded choices, remains at HITL1, and returns to
the same probe/Gate retry boundary; it SHALL not add a retry tree, second
writer, status tree, Gate, provider path, receipt, ledger, or evidence surface.

All accepted PRP-002 behavior not explicitly replaced below remains normative:
the topic recommendation/clear-decision mapping, status-before-topic-state
apply, atomic canonical registry and UID-bound seed materialization, style
handoff freshness repair, payload fields, selected adapter boundary, on-Gate
pass/failed-hint handling, and HITL1 stop semantics. In particular, the
delegation change neither authorizes a status hand edit nor changes setup
advance, canonical Topic ownership, user-control snapshots, profile fields, or
the Gate's prerequisites.

The probe agent SHALL make exactly one search invocation using the literal
neutral query. A syntactically eligible candidate is an actual returned HTTP(S)
URL in provider order with no raw single quote, ASCII whitespace/control,
credentials, localhost, loopback, literal private, or link-local target. It
SHALL consider only the first three eligible candidates, never invent,
normalize, substitute, or retain query/URL history.

For each considered candidate, the probe agent SHALL invoke the available native
fetch surface first. Only when it is absent before invocation or its one attempt
returns no real page content because it is blocked, unavailable, or failed, and
independently configured host shell/network permission permits the exact action
and target, it MAY invoke at most one standalone same-URL fallback:

```bash
curl --fail --silent --show-error --location --max-time 15 --max-redirs 5 --proto '=http,https' --proto-redir '=http,https' --globoff -- '<same-url>'
```

The fallback SHALL contain no prefix assignment, pipe, redirection, command
substitution, shell chaining, or trailing command; requests and redirects stay
HTTP(S)-only and host DNS/network policy remains authoritative. A native or
permitted fallback response with real requested page content ends the probe. A
later candidate is legal only after the current permitted sequence cannot return
real content; a permission, absent-surface, or other no-legal-path boundary
stops the probe at that candidate. The probe agent SHALL not repeat a surface,
add a fallback tier, make another search, or create automatic retry state.

The valid return map SHALL preserve the existing observation branches:

- no callable/failed/blocked search or no eligible candidate: `unavailable`,
  `fetch_outcome: not_attempted`, count `0`, no ordinal or URL, and a direct
  reason (using existing `surface_absent:` / `permission_required:` prefixes
  when applicable);
- real native or fallback content: `available`, ISO `probed_at`, returned
  `result_url`, `fetch_outcome: success`, actual successful `fetch_surface`,
  count `1..3`, and final ordinal;
- a positive-count no-legal-path or exhausted branch: `unavailable`, final
  returned URL, truthful attempted or not-attempted outcome/surface, count and
  ordinal, and one direct reason.

Only real fetched page content permits `available`; command exit success, an
empty body, search snippets, or HTTP error/challenge shells do not. The Phase
Agent SHALL use only the direct observation status to choose HIU-002's result;
that result is rendered after the write and before the same Gate, is not a Gate
verdict, and shall not announce silent execution. Native policy failure does
not create shell permission or a bypass. Probe URL/content and tool output SHALL
not become production evidence, cache, submitted output, receipt, Gate coverage,
or a new interaction checkpoint.

#### Scenario: Phase delegates the fixed probe after the recorded decision

- **WHEN** HITL1 has completed topic-state and style prerequisites
- **THEN** the Phase Agent SHALL render the pre-probe notice and spawn exactly one
  probe agent using the dedicated guidance and fixed query
- **AND** the Phase Agent SHALL not itself invoke native search or fetch

#### Scenario: Phase retains the existing write and Gate owners

- **WHEN** the probe agent returns an existing schema-valid available or unavailable observation
- **THEN** the Phase Agent SHALL write that observation to `rb_profile.yaml`, render
  the matching result, and run the same HITL1 Gate
- **AND** the probe agent SHALL not write bundle state or run the Gate

#### Scenario: Invalid delegation result is honest unavailable

- **WHEN** probe-agent spawn fails, returns nothing, or returns an invalid observation
- **THEN** the Phase Agent SHALL write one honest unavailable branch with a direct reason
- **AND** it SHALL preserve recorded choices and expose the same probe/Gate path without
  an automatic retry or an invented success

#### Scenario: Returned native success has the accepted shape

- **WHEN** a probe agent fetches real page content from the first eligible returned candidate
- **THEN** it SHALL return `available` with count and ordinal `1`, that candidate URL,
  `fetch_outcome: success`, and its actual native surface
- **AND** it SHALL not invoke curl, consider another candidate, or retain page content

#### Scenario: Returned fallback and unavailable branches retain existing bounds

- **WHEN** native fetch cannot return real content
- **THEN** the probe agent SHALL use at most one independently permitted same-URL curl
  fallback and otherwise return the truthful unavailable branch
- **AND** it SHALL not change URLs, skip a no-legal-path candidate, add a tier, or ask the
  user to operate the pipeline

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

`phase-hitl1.md` SHALL expose the existing minimum write checklist:
`research_profile`, `root_must_answer_set`, `research_style_params`,
`research_access.status`, candidate count/ordinal, available and unavailable
branch fields, and `human_decision_checkpoints.hitl1.status`/`.recorded_at`.
The list remains an alignment/review surface rather than schema authority.

The checklist SHALL identify `rb_profile.yaml#/research_access` as Phase-owned:
the probe agent returns no persisted artifact, and optional `search_surface` /
`fetch_surface` labels remain non-Gate-required audit labels. A no-candidate
unavailable observation alone may have count zero without ordinal or URL; every
positive-count observation retains the final considered URL.

#### Scenario: Human can audit the isolated observation handoff

- **WHEN** a human reviewer reads `phase-hitl1.md`
- **THEN** the reviewer SHALL see the complete existing observation fields and that
  the Phase Agent, not the probe agent, writes the profile
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

After the user decision and any material-conflict resolution are complete,
HITL1 SHALL write the exact URC-001 no-controls or supplied-controls form to
`rb_plan.md` before it creates the retained input for `operate-topic-state
apply`. When a focus is accepted, that form includes the existing literal
user-wording and Agent-interpretation convention. The existing canonical
topic-state transaction SHALL then preserve that current host-file body while
refreshing its frontmatter and Topic Registry presentation. The controls
snapshot SHALL NOT be copied into the topic-state input schema, Topic identity,
seed identity, profile, Gate, or Engine authority fields.

If topic-state apply returns an accepted workspace or recovery boundary, the
Agent SHALL use its existing exact inspect/recover/apply operation. It SHALL
retain and read the already-durable host-file snapshot; it SHALL NOT reconstruct
controls/focus from chat memory, reread an external source path, or ask the
user to repeat a decision whose snapshot remains readable.

#### Scenario: canonical topic-state apply preserves captured controls
- **WHEN** HITL1 captures a valid supplied-controls snapshot containing an
  accepted focus and then applies approved canonical topics
- **THEN** the committed `rb_plan.md` retains the exact controls form while its
  Topic Registry is refreshed
- **AND** the snapshot does not appear in topic-state input, profile, seed
  identity, or Engine authority fields

#### Scenario: topic-state recovery does not lose a snapshot
- **WHEN** topic-state apply leaves an accepted recovery workspace after
  controls/focus were captured
- **THEN** recovery uses the existing workspace owner
- **AND** the active or recovered host file retains the durable controls
  snapshot without an external-path reread or repeated user decision

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
