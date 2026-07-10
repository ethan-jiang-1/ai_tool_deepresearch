## Why

来源：`_backlog/bugs/BUG-071-missing-search-capability-contract-and-graceful-degradation.md`。Canonical research waves 硬依赖真实 search + fetch，但框架在进入 silent execution 前从不确认当前 Agent 环境是否具备该能力；受限环境会到 Wave0 才静默卡死，Agent 只能在造假、越权补救和无期限等待之间自行猜测。

Change1 已将 framework 基线推进到 `v0.17`，并确立 one authority path、shortest checker path、prerequisite-first 与 one-repair feedback。Change2 应沿用这个基线：不建设新的 capability controller，而是在用户本来就在场的 HITL1 用一次真实、有限、可记录的 probe 直接回答“当前环境能否搜索并抓取一个真实页面”；不可用就早失败并明确交还用户。

## What Changes

- HITL1 在用户确认 profile/must-answer 且 research style 已应用后，执行一次 bounded real search + fetch probe：至多一次中性搜索，抓取第一个 usable HTTP(S) result，至多一次 fetch，不建立自动重试树。
- 在 `rb_profile.yaml` 增加最小 `research_access` observation：`unprobed | available | unavailable` 三个严格分支；工具 surface 名称只作 optional audit label，不作为 gate 必填事实。
- `ProfileSchema` 直接校验 observation：available 必须有 ISO probe 时间、HTTP(S) result URL 与 `fetch_outcome: success`；unavailable 必须有 ISO probe 时间、非 success outcome 与非空 reason；unprobed 不得携带成功事实。
- `apply-research-style.mjs` 只替换 research style 相关字段并保留 profile 其他已记录 section，特别是 `research_access`，避免 HITL1/rerun 的 style 重算抹掉 capability observation。
- HITL1 frontmatter 将 search policy 从 `no_search` 收敛为 `capability_probe_only`，并由现有 workflow consistency validator 识别这一狭窄例外。
- HITL1 gate 复用现有 authority path：`ProfileSchema` 校验 observation 结构，现有 `field_value` rule 检查 `research_access.status == available`；不新增 check type、validator、inspect command 或 capability framework。
- Missing/unprobed/unavailable 均留在 HITL1；用户已记录的 profile/must-answer 决策保留，环境修复后只需重跑同一 probe 和同一 gate。
- Probe URL/content 不进入 reference、artifact、cache、ledger、work-unit output 或 Wave coverage。
- 不实现 offline report、无证据分析骨架、用户素材 ingestion、curl 探针矩阵或 generalized capability registry。
- Framework behavior changes require a version bump; target version: `v0.18`，并保持先于 Change3 `put-continuation-cues-at-decision-points` (`v0.19`) apply。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `schema-core`: Profile contract 增加最小、严格分支化的 research-access observation。
- `research-styles`: Style writer 更新参数时保留 profile 其他 authority fields，不再通过字段 allowlist 重建整个 profile。
- `workflow-node-contract`: HITL1 execution contract 增加 validator-enforced 的 `capability_probe_only` search policy。
- `pre-research-phase-content`: HITL1 负责执行并记录单次 bounded capability probe，明确 probe 非 evidence。
- `pre-research-gate-implementation`: HITL1 gate 复用现有 `field_value` rule，在进入 silent waves 前 fail fast 检查 research access。

## Impact

- 预计影响 `ProfileSchema`、profile template、`apply-research-style.mjs`、workflow consistency validator、HITL1 phase、HITL1 gate definition、gate-rule audit inventory、相关 regression tests 与 controlled playbooks。
- Deterministic tests/playbooks 中为 HITL1 pass 准备的 profile fixture 必须加入 synthetic valid `research_access`，并明确这些 fixture 只证明 schema/gate mechanics，不证明真实 Agent 外部能力。
- 新增 `experiments_playbook/exp_wff_pre-research-repair/case-115-heavy-hitl1-research-access-probe.md`，由当前 Agent 实际执行 search/fetch；available 与 honest unavailable 都是合法环境观察，禁止 mock、固定 URL 或手写成功结果。
- Engine 只验证 Agent observation 的结构和 gate eligibility，不声称能独立证明宿主工具调用真实发生。
- Existing profiles without `research_access` remain schema-readable；仅在 HITL1 gate 被评估时按 unprobed 阻止，不对已经越过 HITL1 的旧 bundle 做追溯迁移。
- 不新增依赖，不新增并行状态树，不使用 fake search/fetch 作为 E2E 证据。
