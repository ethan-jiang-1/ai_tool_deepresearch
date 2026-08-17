# Proposal: repair-run-contract-surfaces

## Why

`_backlog/bugs/BUG-225..231`（source: `dpt_rb_ai-transformation-organization` 完整真实 run，
HITL1→Wave0→Wave1→Wave2→HITL2→Final，2026-08-17 记卡）暴露 7 个 active bug。经 current-head
逐项复验（disposable bundle 实测 + 源码对照），全部属于同一根因族：**Agent 每次运行都会读到的契约
表面（phase 文档、envelope 示例、gate 定义文案、shared-schemas、claim stdout、run-scoped 脚本落点）
与 Engine 确定性契约不一致或缺失**。Agent 按权威表面执行必然被 gate/inspect/授权检查打回，只能读
源码反推正确路径——直接违反项目「无二义、低负担」的自设要求（见 `_backlog/bugs/README.md` 各卡
「为什么是框架缺陷」节）。

## What Changes

按 bug 卡编号收口（7 项修复，全部为文案/示例/scaffold/回归锁层面，**不改任何引擎裁决逻辑**）：

1. **BUG-225**（claim stdout 契约）：current-head 实测 claim stdout 已是合法 JSON（`emit` 用
   `JSON.stringify`，`spawn_prompt` 只内嵌 ~1.7KB 引导文本而非 task.md 全文），原事故路径在当前代码
   不存在。收口 = (a) 新增回归测试锁死「claim stdout 必须是单个可解析 JSON 文档」（wave0 delegated +
   wave1 fallback 两条路径）；(b) 在 `shared-schemas.md` 文档化 `result_hash` 基准
   `sha256(stableStringify(result))`（`engine/work-unit-utils.mjs`）——事故恢复时无从得知该基准。
   新增规范要求 SUD-008 作行为锁定。
2. **BUG-226**（HITL1 topic-state apply 死锁）：`canonical-topic-state.mjs#lifecycleAuthorization`
   要求 `current_node === phases/phase-hitl1.md`（accepted spec CTS 已如此要求，引擎行为正确），但
   `phase-instantiation.md` §6 / `phase-hitl1.md` §6 的 WNC-010 例外措辞被泛化成「连 enter-phase 都不
   执行」，且 `tests/integration/md/harness-entry-doc-consistency.test.mjs:83-96` 把错误解读锁进了测试。
   已实测正确顺序可用：instantiation gate pass → `enter-phase --node phases/phase-hitl1.md` →
   `advance-status --to hitl1_recorded` → `operate-topic-state apply --context hitl1` 全绿。
   收口 = WNC-010 例外边界澄清（例外只豁免 advance-status 的 source-gate 同步；enter-phase 仍是合法
   loader）+ 两 phase 文档 §6 修正 + 更新错误测试。
3. **BUG-227**（envelope 示例冲突）：`shared-hitl1-research-access-envelope.md`「Available」示例
   （:152）对单样本 reserve 写 `not_attempted`，与其自身叙述（:92-97）、`ProfileSchema`
   （`profile.mjs:191`）及 accepted `engine/schema-core` spec 矛盾。收口 = 示例改
   `round_budget_not_attempted` + 新增「示例即合法」文档互检测试。
4. **BUG-228**（Wave1 ref floor 文案）：`gate-wave1-complete.definition.json` 写 `threshold: 1` /
   「Create at least one」，实际 `resolveThreshold` 从 profile `wave1_per_topic_ref_floor`（本 run=8）
   解析、且只数 Wave1 submitted backing 的 canonical 候选（两种语义均为 accepted spec 行为）。
   「一次只给一个候选」部分已被 BUG-221/v0.89 修复，本 change 不重复修。收口 = definition
   failure_message 声明「有效阈值来自 profile、仅 Wave1 submitted backing 的 canonical 候选计入」+
   语义锁测试。
5. **BUG-229**（setup 状态窗口写反）：`phase-setup.md` §3 把 gate 后状态
   （`setup_ready`/`seed_topics_ready`）当 gate 前检查；gate 实际要求先 `advance-status --to
   setup_ready`（bootstrap `hitl1_to_setup` 窗口）才能通过。`research/pre-research-phase-content`
   spec PRP-003 也锁了错误措辞。收口 = PRP-003 delta（Allowed Actions 描述 pre-gate 窗口 +
   `advance-status --to setup_ready` 是 gate 前置）+ phase-setup.md §3/§5 修正。
6. **BUG-230**（finding-index 必填键未文档化）：`shared-schemas.md` finding-index 节未标 top-level
   `ledger`/`synthesis` 必填、`cross_topic_resolution` 的 `origin_refs` 非空；两者均为
   `wave-depth-contracts.mjs` checker 的 blocking 要求且已写入 `research/wave2-synthesis` spec。
   收口 = shared-schemas.md 补齐两处约束 + 文档锁测试。
7. **BUG-231**（run-scoped 脚本无规范落点）：scaffold 无 `_scripts/`；`.gitignore:83-84` 的
   `/.gen-*.mjs`/`/.wu*-*.mjs` 补丁模式证明污染反复发生。收口 = `instantiate-run-bundle.mjs` 预建
   `_scripts/` + README scaffold（与 `_logs/`/`_cache/` 同模式）；README「运行时边界」/BUNDLE_MAP
   模板/根 `AGENTS.md` 写明落点与禁止 repo-root 写入；移除 gitignore 两条补丁模式（治本后不再需要）。
   可选守卫（validate-bundle 检测 repo 根脚本并提示）**不做**。

**不改行为**：不改任何 CLI 输出序列化实现、授权检查、阈值解析、Wave2 checker、gate 校验语义；
不重建 run bundle；不重做 BUG-225 事故恢复。全部既有回归保持绿色（唯一受影响的既有测试
`harness-entry-doc-consistency.test.mjs` 锁的是错误解读，属本 change 显式修正范围）。

## Capabilities

### New Capabilities

（无。本 change 不引入新 capability；新增要求归入既有 `agent/subagent-dispatch`。）

### Modified Capabilities

- `workflow/workflow-node-contract`（WNC-010）：bootstrap 例外边界澄清——例外只豁免
  instantiation→HITL1、HITL1→setup 的 advance-status source-gate 同步步骤；enter-phase 仍是加载
  `phase-hitl1.md`/`phase-setup.md` 的合法 loader，phase 文档 SHALL 在 gate pass 后指示
  `enter-phase --node <check.next>`，不得声称例外跳过 enter-phase。
- `research/pre-research-phase-content`（PRP-003）：setup §3 Allowed Actions 的 status 检查改为
  pre-gate 窗口（`hitl1_recorded → setup_ready`），并明确 bootstrap `advance-status --to setup_ready`
  是 setup gate 通过的前置（§5/§6 顺序同步）。
- `bundle/cmd-bundle-instantiation`（CMI-001）：bundle 内容清单加入 `_scripts/`——run-scoped 辅助脚本
  的规范落点（non-authority 运行时区域，随 bundle 归档），playbook 与 creator scaffold 一致。
- `workflow/workflow-directory-contract`（WDC-004）：current run bundle root 裸路径族加入 `_scripts/`，
  并声明 run-scoped 辅助脚本 SHALL 写入 current run bundle root `_scripts/`，不得写入 repo root 或
  framework root。
- `agent/subagent-dispatch`（新增 SUD-008）：`operate-work-unit claim` stdout SHALL 是单个机器可解析
  JSON 文档（行为已满足，作规范性锁定 + 回归保护）。

## Impact

- **代码面**：`DEEP_RESEARCH_HARNESS/cli/instantiate-run-bundle.mjs`（dirs 列表 + scaffold 模板映射）、
  `DEEP_RESEARCH_HARNESS/rb_templates/_scripts/README.md.tmpl`（新模板）、
  `DEEP_RESEARCH_HARNESS/rb_templates/BUNDLE_MAP.md.tmpl`（目录外形 + 裸路径说明）、
  `DEEP_RESEARCH_HARNESS/schema/gate_definitions/gate-wave1-complete.definition.json`（failure_message 文案）。
- **文档面**：`phase-instantiation.md` §6、`phase-hitl1.md` §6（WNC-010 例外措辞）、`phase-setup.md`
  §3/§5（status 窗口）、`shared-hitl1-research-access-envelope.md`（Available 示例）、`shared-schemas.md`
  （finding-index 必填键 + `result_hash` 基准）、`DEEP_RESEARCH_HARNESS/README.md`「运行时边界」、
  根 `AGENTS.md`（run 边界硬规则）、`.gitignore`（移除两条补丁模式）。
- **测试面**：新增 `tests/integration/cli/work-unit-claim-stdout-json.test.mjs`；新增/扩展 md 文档锁
  测试（envelope 示例、finding-index 约束、gate definition 文案、`_scripts/` scaffold）；
  修改 `tests/integration/md/harness-entry-doc-consistency.test.mjs`（WNC-010 新措辞）。
- **无新依赖、无新 CLI、无新 capability、无运行时裁决行为变化。**

## Capability Discovery

| Candidate path | Evidence read | Decision | Reason |
| --- | --- | --- | --- |
| `workflow/workflow-node-contract` | WNC-010（spec.md:275-316）：handoff 序列 enter-phase→advance-status +「instantiation/HITL1 bootstrap status shape 是兼容例外，SHALL NOT be silently rewritten」 | Modify | F2 需要把例外边界从「不执行 handoff」收敛为「仅豁免 advance-status 步骤」；这是 spec 级行为要求变更 |
| `research/pre-research-phase-content` | PRP-003（spec.md:192-219）：setup Allowed Actions 明确要求「检查 rb_status.json 仍然是 setup_ready/seed_topics_ready」——锁了错误措辞 | Modify | F5 的文档修正与 PRP-003 冲突，必须同步改 requirement |
| `bundle/cmd-bundle-instantiation` | CMI-001（spec.md:7-25）：bundle 内容清单枚举 scaffold 目录，无 `_scripts/` | Modify | F7 把 `_scripts/` 加入实例化内容契约 |
| `workflow/workflow-directory-contract` | WDC-004（spec.md:128-180）：裸 runtime path 族枚举 `_cache/`/`_logs/`/`_work_units/` 等，无 `_scripts/`；current run bundle root 是唯一 mutable runtime 根 | Modify | F7 把 `_scripts/` 加入运行时路径族并规定脚本写入边界 |
| `agent/subagent-dispatch` | SUD-001..007（spec.md）：claim 返回 dispatchable prompt；无 stdout JSON 机器可解析要求 | Modify | F1 新增 SUD-008 规范性锁定（行为已满足，防回归） |
| `research/canonical-topic-state` | CTS（spec.md:78）：HITL1 apply SHALL require `current_node: phases/phase-hitl1.md` + `hitl1_recorded → setup_ready` 窗口 | Verify-only | F2 的引擎行为正是 accepted spec；只修 phase 文档与测试 |
| `engine/schema-core` | SCO（spec.md:99）：whole-probe `not_attempted` vs `round_budget_not_attempted` 语义已规范 | Verify-only | F3 只修 envelope 示例（derived surface），schema 不动 |
| `research/research-wave-gate-implementation` | 场景（spec.md:85-101）：profile floor（8）与 canonical-only 计数已规范 | Verify-only | F4 只修 definition failure_message（derived surface），阈值/计数语义不动 |
| `research/wave2-synthesis` | 要求（spec.md:58-64, 82, 213）：top-level keys 含 ledger/synthesis；cross_topic_resolution 非空 origin_refs | Verify-only | F6 只修 shared-schemas.md 文档（derived surface） |
| `agent/agent-output-declaration` | 要求（spec.md:54,124）：ledger row SHALL include `result_hash` | Verify-only | F1 只补 hash 基准文档（`sha256(stableStringify(result))`），字段契约不动 |
| `engine/cli-phase-transition` | CPT（spec.md:389,491-492）：bootstrap 兼容例外（setup）保持窄义 | Verify-only | F5/F2 不触碰 advance-status 实现；仅文档顺序修正 |

## Semantic-Precision Reflection（F7 新增 `_scripts/` 落点）

- **读者/有界问题**：Phase Agent 在 wave 执行中需要编写 run 内部一次性脚本（executor/生成器/恢复脚本）。
  问题 =「这个 run 自产的脚本应该 durably 落在哪里，才能随 bundle 归档且不污染 repo」。
- **必须保留的区别**：`_scripts/` 是 **non-authority 运行时区域**（与 `_logs/`、`_cache/` 同级）——
  不进入任何 gate/inspect 校验、不建立 evidence/provenance 语义；脚本仍是 Agent 自产执行辅助，不是
  Engine 资产。`repo_command_root`（命令位置）与 `current_run_bundle_root`（runtime truth 根）的
  坐标区分保持不变。
- **正常推理停止点**：文档说明 + scaffold 预建 + gitignore 补丁移除即停止；不做运行时守卫（检测 repo
  根脚本的 validate-bundle hint 明确列为 non-goal，避免新增控制层）。

## Direct Source of Record / 最短合法闭环 / Net Simplification

- **Source of Record**：每个修复只对准一个直接权威——WNC-010/PRP-003/CMI-001/WDC-004 accepted spec +
  `canonical-topic-state.mjs`/`resolveThreshold`/`wave-depth-contracts.mjs`/`ProfileSchema` executable
  contract；文档/示例/文案只是对齐，不另造第二套 truth。
- **最短合法闭环**：F1 用回归测试 + 一行 hash 基准文档替代 Agent 的永久反推；F2/F5 用文档修正让
  Agent 按文档即可通过，不再需要读源码；F7 用 scaffold 落点消除「无落点→repo 根」的默认行为。
- **Net simplification**：移除 `.gitignore` 两条掩盖性补丁模式；修正一处把错误解读锁进测试的既有测试；
  不新增任何具名 state/projection/concept/command/state 字段。

## 责任边界

- **User decision**：无新用户决策面；HITL1/HITL2 语义不变。
- **Agent execution**：文档修正后 Agent 按文档执行即可通过既有确定性检查；`_scripts/` 是 Agent 自产
  脚本的授权落点。
- **Engine verdict**：全部 Engine 裁决逻辑（授权窗口、阈值解析、checker、claim 序列化）零改动；
  本 change 不创建任何新 permission/capability/authority 面。
