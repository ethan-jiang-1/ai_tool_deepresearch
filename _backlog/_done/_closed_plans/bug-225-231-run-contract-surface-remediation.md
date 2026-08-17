# Plan: bug-225-231-run-contract-surface-remediation

> 状态: active（plan 已提交，等待 review → 进入 OpenSpec apply）| 更新: 2026-08-17
> 来源: `_backlog/bugs/BUG-225..231`（dpt_rb_ai-transformation-organization 真实 run 的 7 个活跃 bug）

## 结论先行：用几个 change？

**1 个 OpenSpec change**：`2026-08-17-repair-run-contract-surfaces`（propose 阶段已完成，工件在
`openspec/changes/2026-08-17-repair-run-contract-surfaces/`）。

理由：7 个 bug 同属一个根因族——**Agent 读到的契约表面（phase 文档 / envelope 示例 / gate 定义文案 /
shared-schemas / claim stdout / 脚本落点）与 Engine 确定性契约不一致或缺失**；全部是文案、示例、
scaffold 与回归锁层面的修复，没有引擎裁决逻辑改动，不需要拆多个生命周期。仓库历史也支持单 change
多 bug 收口（如 `make-agent-operation-contracts-direct` 一次归档 12 个 bug）。

## Current-head 复验结论（每个 bug 都先重验过）

| Bug | 复验结果 | 修复内容 | 类型 |
|-----|----------|----------|------|
| BUG-225 (P1) claim stdout 非合法 JSON | **症状未在 current head 复现**：disposable bundle 实测 wave0 delegated + wave1 fallback 两种 claim，stdout 均 `JSON.parse` 通过、无裸控制字符（`emit` 已是 `JSON.stringify`，`spawn_prompt` 只内嵌 ~1.7KB 引导文本而非 task.md 全文）。事故根因（把 task.md 全文塞进 stdout）在当前代码里已不存在 | (a) 新增回归测试锁死「claim stdout 必须是单个可解析 JSON 文档」（wave0 + wave1 fallback 两路径）；(b) 文档化 `result_hash = sha256(stableStringify(result))`（`engine/work-unit-utils.mjs`），这是事故恢复时无从得知的基准 | 测试 + 文档 |
| BUG-226 (P1) HITL1 topic-state apply 死锁 | **确认**：`canonical-topic-state.mjs:1418` 要求 `current_node=phase-hitl1.md`，而 phase-instantiation.md §6 / phase-hitl1.md §6 说「不执行 enter-phase」；`harness-entry-doc-consistency.test.mjs:83-96` 竟然把错误解读锁进了测试。已实测正确顺序可用：instantiation gate pass → `enter-phase --node phases/phase-hitl1.md` → `advance-status --to hitl1_recorded` → topic-state apply 全绿 | WNC-010 spec 澄清（bootstrap 例外只豁免 advance-status 的 source-gate 同步，enter-phase 仍是合法 loader）+ 两 phase 文档 §6 措辞修正 + 更新错误测试 | spec delta + 文档 + 测试 |
| BUG-227 (P2) envelope 示例 `not_attempted` 冲突 | **确认**：`shared-hitl1-research-access-envelope.md:152` Available 示例对单样本写 `not_attempted`，与其自身叙述（92-97 行）、`ProfileSchema`、`schema-core` spec 都矛盾 | 示例改 `round_budget_not_attempted` + 新增「示例即合法」互检回归测试 | 文档 + 测试 |
| BUG-228 (P1) Wave1 floor 阈值不可发现 | **确认**：`gate-wave1-complete.definition.json` 写 `threshold: 1` + 「at least one」，实际 `resolveThreshold` 从 profile `wave1_per_topic_ref_floor`（本 run=8）解析；且只数 Wave1 submitted backing 候选（spec 已如此要求）。「一次只给一个候选」部分已被 BUG-221/v0.89 修复，**不在本 change 重复修** | definition failure_message 改为声明「有效阈值来自 profile，仅 Wave1 submitted backing 的 canonical 候选计入」+ 语义锁测试 | 定义 JSON + 测试 |
| BUG-229 (P3) phase-setup 状态窗口写反 | **确认**：`phase-setup.md §3` 把 gate 后状态当 gate 前检查；gate 实际要求先 `advance-status --to setup_ready`（bootstrap hitl1_to_setup 窗口）。`pre-research-phase-content` spec PRP-003 也锁了错误措辞 | PRP-003 delta（Allowed Actions 描述 pre-gate 窗口 + gate 前置步骤）+ phase-setup.md §3/§5 修正 | spec delta + 文档 |
| BUG-230 (P2) finding-index 必填键未文档化 | **确认**：`shared-schemas.md` finding-index 节未标 `ledger`/`synthesis` 必填、`cross_topic_resolution` 的 `origin_refs` 非空；`wave2-synthesis` spec 与 `wave-depth-contracts.mjs` 均已有此要求 | shared-schemas.md 补齐两处约束 + 文档锁测试 | 文档 + 测试 |
| BUG-231 (P2) run-scoped 脚本无规范落点 | **确认**：scaffold 无 `_scripts/`；`.gitignore:83-84` 的 `/.gen-*.mjs`/`/.wu*-*.mjs` 补丁模式证明反复发生；README/BUNDLE_MAP/AGENTS.md 均无约定 | instantiate 预建 `_scripts/` + README scaffold（与 `_logs/`/`_cache/` 同模式）；README「运行时边界」/BUNDLE_MAP/根 AGENTS.md 写明落点；移除 gitignore 两条补丁；CMI-001/WDC-004 spec delta | spec delta + 代码 + 文档 + 测试 |

## Change 结构（openspec/changes/2026-08-17-repair-run-contract-surfaces/）

**5 份 delta spec（全部是 MODIFIED，无新增 capability）**：

1. `workflow/workflow-node-contract` — WNC-010：bootstrap 例外边界澄清（例外=advance-status source-gate 同步；enter-phase 仍是加载 phase-hitl1.md 的合法 loader，instantiation gate pass 后必须执行）
2. `research/pre-research-phase-content` — PRP-003：setup §3 Allowed Actions 改为 pre-gate 窗口（`hitl1_recorded → setup_ready`）+ 明确 `advance-status --to setup_ready` 是 gate 前置
3. `bundle/cmd-bundle-instantiation` — CMI-001：bundle 内容清单加入 `_scripts/`（run-scoped 脚本的规范落点）
4. `workflow/workflow-directory-contract` — WDC-004：current run bundle root 裸路径族加入 `_scripts/`，声明非权威可重建运行时区域
5. `agent/subagent-dispatch` — 新增 SUD-008：claim stdout 必须是单个机器可解析 JSON 文档（行为已满足，作规范性锁定 + 回归保护；apply 时在 `req-registry.yaml` 直注册该 ID，不走 reservation 文件）

**代码/文件改动（apply 阶段）**：

- `schema/gate_definitions/gate-wave1-complete.definition.json`（BUG-228 failure_message 文案）
- `cli/instantiate-run-bundle.mjs` + `rb_templates/_scripts/README.md.tmpl` + `rb_templates/BUNDLE_MAP.md.tmpl` + `command_playbook/instantiate-run-bundle.md`（BUG-231 scaffold/playbook）
- `workflows/nodes/phases/phase-instantiation.md`、`phase-hitl1.md`（BUG-226 §6）、`phase-setup.md`（BUG-229 §3/§5/§6）
- `workflows/nodes/shared/shared-hitl1-research-access-envelope.md`（BUG-227 示例）
- `workflows/nodes/shared/shared-schemas.md`（BUG-230 + result_hash 基准说明）
- `DEEP_RESEARCH_HARNESS/README.md`「运行时边界」、根 `AGENTS.md`（BUG-231）
- `.gitignore`（移除 83-84 两条补丁模式）

**测试**：

- 新增 `tests/integration/cli/work-unit-claim-stdout-json.test.mjs`（BUG-225：claim stdout 可解析 JSON，wave0 delegated + wave1 fallback）
- 修改 `tests/integration/md/harness-entry-doc-consistency.test.mjs`（BUG-226：改锁修正后的 WNC-010 措辞）
- 新增 envelope 示例互检 + shared-schemas finding-index 文档锁（BUG-227/230，可合并一个 md 测试文件）
- 新增 gate-wave1 definition 文案语义锁（BUG-228）
- 修改/新增 instantiate scaffold 断言（BUG-231：新 bundle 含 `_scripts/` + README）
- 可选：fresh-bundle HITL1 全链路测试（instantiation gate → enter-phase → topic-state apply），复用现有 disposable 模式

**治理**：`semantic-closure.yaml`（affected：新增 family `bundle.run-scoped-script-location` + 各 derived overlap）、
`verification-plan.yaml`（integration selected 证据）、apply 时在 `req-registry.yaml` 直注册 SUD-008
（既有 live capability 新增 ID，不走 reservation 文件）、tasks 收尾两条 governance checker、
`openspec validate --strict`、`npm test` 全量回归。

## 明确不做（边界）

- **不改任何引擎裁决逻辑**：`lifecycleAuthorization`、`resolveThreshold`、`wave-depth-contracts` checker、
  claim 序列化实现全部不动（current head 行为已正确，缺的是文档/定义/测试一致性）。
- **不重做 BUG-225 的事故恢复**（bundle 已恢复并验证 hash 一致）；只加回归保护与 hash 基准文档。
- **不做 BUG-231 的可选守卫**（validate-bundle 检测 repo 根 `.gen-*.mjs`/`.wu*-*.mjs` 并提示）——列为可选，
  默认不做；文档 + scaffold + 移除 gitignore 补丁已构成治本。
- **不修 run 级观察**（Bing 中文本地化、执行器脚本自身 bug 等非框架缺陷，见 `_backlog/bugs/README.md`）。
- **不重开 BUG-221 已修复项**（单候选 inspect 在 v0.89 已修，本次只确认不重复）。

## 验证与收口

1. 新增/修改测试单独跑绿（claim-stdout-json、harness-entry-doc-consistency、md 文档锁、instantiate scaffold）
2. 受影响回归子集全绿（`tests/integration/cli/`、`tests/integration/md/`、`tests/engine/` 相关文件）
3. 全量 `npm test` 0 fail
4. `openspec validate --strict` + governance checkers（check-project-reqs / check-project-specs /
   check-semantic-closure / check-content-drift 等）全绿
5. 按 OpenSpec 生命周期 apply → archive（finalizer），bug 卡按 `_backlog/bugs/README.md` 步骤移入
   `_done/_fixed_bugs/` 并更新计数

## 风险

- **WNC-010 是 spec 级修改**：必须完整走 propose→apply→archive，且要同步改掉锁错解读的既有测试——
  这是本 change 唯一需要「先破后立」的点，已列为显式任务。
- BUG-225 的「症状未复现」结论基于 disposable-bundle 实测：若你希望连「claim stdout 体积/字段裁剪」也做，
  可加一条任务（默认不做，避免过度设计）。
- `_scripts/` 新目录是新增运行时表面：保持与 `_logs/`/`_cache/` 同级的 non-authority 语义，不进入任何
  gate 校验，避免扩张 inspect-bundle required shape。
