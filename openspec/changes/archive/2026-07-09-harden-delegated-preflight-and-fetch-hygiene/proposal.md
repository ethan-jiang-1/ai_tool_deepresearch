## Why

`dpt_rb_martin-fowler-ai-sdlc-retreats` 的性能复盘已经被两个已归档 change 吃掉了大部分根因：`2026-07-08-stabilize-agent-facing-work-unit-contracts` 修完 submit 前入口合同，`2026-07-09-align-gate-contracts-and-reference-navigation` 修完 gate / reference judgment layer。另一个已归档 change `2026-07-08-parallel-delegated-phase-execution-and-reference-materialization` 也已经让 Wave0/Wave1 用 bounded batched claim 和 active polling，避免跨 work-unit 串行等待。

剩下的不是大功能，而是打扫卫生：减少仍可避免的 submit 往返、避免单个 Sub-agent 抓多个 URL 时串行浪费、并让 Wave0/Wave1 的抓取目标跟 profile floor 绑定，不靠临场 hard-coded aim 超射。来源是 `_backlog/plans/martin-fowler-run-performance-tuning.md` 中未被归档 changes 覆盖的 D / E 剩余项。

当前缺口：

- `operate-work-unit submit` 是唯一成功边界，但 Agent 缺一个只读 `dry-submit`，无法在正式 submit 前一次性看到 result/output/source/cache/receipt 的全部可修复违规。
- Wave0/Wave1 Sub-agent role docs 只列出 per-URL fetch fallback chain，没有说明 fallback chain 是单 URL 内逐级降级；多个候选 URL 应优先小批量抓取，只有工具/runtime 原生支持且站点礼貌允许时才做有界并行，以提速而不降低 coverage。
- Wave0/Wave1 phase docs 已经教 bounded batched claim，但还没有明确：每个 delegated task 的候选抓取目标应从 `rb_profile.yaml#/research_style_params` floor 推导为 `floor + small margin`，而不是使用无法从 active profile/runtime floor 推导的固定 hard-coded aim。
- `subagent-dpt-source-intake.md` 仍写了 Python fallback，这和 repo-wide “Absolutely no Python” 约束冲突；fallback 应替换为 JS/Node.js 技术栈，而不是保留 Python 旁路。

## What Changes

- 新增 `operate-work-unit dry-submit` 只读预检能力：
  - 复用正式 submit 的读取、result schema、output file、source claim、cache trail、receipt / identity / nonce / queue binding 校验路径。
  - 对正式 submit 会 canonicalize 的 result/receipt/cache surface 使用内存里的 virtual canonical view 做等价验证，但不 append ledger、不 complete queue、不修改 work-unit status、不写 canonicalized result/receipt/cache surfaces、不改 `last_submit_rejection`、不创建 trace/log/transaction 记录。
  - 返回结构化 `ok`、`reason_codes`、`violations[]`、`normalizations[]` 或等价字段；失败也从 dry preflight path 输出 JSON，不能退化成 stderr-only exception，让 Agent 一次修完多个问题后再正式 submit。
- 明确 dry-submit 与正式 submit 的边界：
  - dry-submit 可以报告“正式 submit 会执行的 narrow canonicalization”，但不能把 canonicalization 持久化；cache `page-content.md` -> `page.md` 这类现有写入型 canonicalization 必须走 read-only planning path。
  - dry-submit 的 candidate `--result` 路径语义必须镜像正式 submit：不要求结果文件一定在 assigned work-unit dir；只有 nonce 修正仍受正式 submit 既有 assigned-dir containment 约束。
  - dry-submit 失败必须从 preflight helper 返回结构化 JSON，不能走正式 submit 的 `recordSubmitRejection` 路径。
  - 正式 submit 仍是唯一 successful delegated completion transition。
  - dry-submit 不是 gate、不是 ledger amend、不是历史 row 修复工具。
- 更新 Wave0/Wave1 Sub-agent fetch guidance：
  - fallback chain 是单 URL 内的降级链。
  - 不同 URL 优先小批量抓取；只有工具/runtime 原生支持 bounded parallel 时才并行，并受站点礼貌、timeout、Sub-agent 上下文预算约束。
  - 禁止用 search snippets 替代 fetched page content；小批量/有界并行抓取不降低 cache trail / source claim / receipt 要求。
  - 将 Python fallback 替换为 JS/Node-first fetch guidance：优先使用内置页面抓取工具 / browser / Node.js `fetch`；`curl` 只能作为现有 CLI 工具 fallback，不得引入 Python 旁路。
- 更新 Wave0/Wave1 phase guidance：
  - 每个 delegated search task 读 explicit profile floor。
  - 候选 URL / source intake target 用 `floor + small margin` 作为默认策略；margin 保守，用于抵消 fetch failure / duplicate / non-countable source，不替代 gate floor。
  - 不使用无法从 active profile/runtime floor + named margin 推导的固定 aim；如果需要更高覆盖，必须来自 profile/runtime explicit requirement 或 gate repair/refill。
- 增加 hygiene / regression guard：
  - `operate-work-unit dry-submit` CLI 测试覆盖 ok、multi-violation、no-side-effect。
  - Markdown/static tests 覆盖 fetch chain 单 URL 降级、multi-URL batching guidance、JS/Node-first fallback、Python fallback 移除、floor+margin wording、以及无未绑定 profile/runtime floor 的固定 aim。
  - 必须有 static regression guard；可以是 focused Markdown/static tests，也可以扩展 `validate-work-unit-hygiene.mjs` pattern guard，阻止 active phase/sub-agent guidance 再出现 Python fallback、Python fetch workaround，或未绑定 profile/runtime floor + margin 推导的 hard-coded fetch aim。
- 明确不产出：不改变 gate semantics；不改变 research floors；不降低 source coverage；不新增依赖；不使用 Python；不新增 general submitted-ledger amend / metadata-only relabel；不实现 Engine-owned JS fetcher、browser fetcher 或 Agent workflow daemon。JS/Node-first fetch tier 只属于 Sub-agent guidance，不把 search/fetch 编排搬进 Engine。
- 版本：需要 version bump，target version 为 `v0.14`。implementation 阶段需要更新 `CHANGELOG.md` 和 `DPT_FRAMEWORK/RUN.md` 版本横幅。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `delegated-work-units`: 增加只读 work-unit dry-submit 预检，复用正式 submit validator 并报告批量违规，但不产生 ledger/queue/work-unit 状态副作用。
- `subagent-node-contract`: Wave0/Wave1 Sub-agent fetch guidance 区分 per-URL fallback 与 multi-URL 小批量/有界并行抓取，并把 Python fallback 替换为 JS/Node-first fetch fallback。
- `research-wave-phase-content`: Wave0/Wave1 phase docs 将抓取目标绑定到 profile floor + small margin，避免 hard-coded aim 超射，同时保持 gate floor 和 coverage 不变。

## Impact

- 预计 implementation 面包括 `DPT_FRAMEWORK/engine/work-unit-submit.mjs` 或拆出的 validation/preflight helper、`DPT_FRAMEWORK/engine/work-unit-core.mjs`、`DPT_FRAMEWORK/cli/operate-work-unit.mjs`、`DPT_FRAMEWORK/workflows/nodes/phases/subagent-dpt-source-intake.md`、`subagent-dpt-evidence-extractor.md`、`phase-wave0.md`、`phase-wave1.md`、以及 `DPT_FRAMEWORK/cli/validate-work-unit-hygiene.mjs`。
- 预计测试面包括 `tests/engine/work-unit-submit.test.mjs` 或新的 focused preflight tests、`tests/integration/cli/operate-work-unit-dry-submit.test.mjs`、Markdown/static tests under `tests/integration/md/`、以及 hygiene CLI tests。
- Requirement registry 已登记 `DEW-013`、`SNC-007`、`RWP-017`；进入 apply 前和 archive 前都必须保持 `openspec/governance/check-project-reqs.mjs` 和 `check-project-specs.mjs` PASS。
- Apply-readiness baseline note：先前 `check-project-reqs.mjs` 报告的 archived `2026-07-09-align-gate-contracts-and-reference-navigation` orphan IDs（`AGO-007`、`WPG-013`、`GSK-011`、`RWP-016`、`RWG-018`、`IOC-005`、`RRM-004`）已确认正文在 main specs 中，缺口是 `> req:` header traceability 漏标；本轮已作为单独 governance/spec-sync cleanup 补齐。该 cleanup 不属于本 change 的功能实现。
- 技术约束保持不变：Node.js >=20，纯 JavaScript ESM，`node:test` + `node:assert`，不新增依赖，不使用 Python。
