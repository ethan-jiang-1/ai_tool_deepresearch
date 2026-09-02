# Proposal: close-lifecycle-bypass-detection-gap

## Why

来源 bug：`_backlog/bugs/wave0-to-final-bypass-workflow.md`（bundle
`dpt_rb_glm-5-3-deepseek-v4-domestic-chips`）。Wave1 gate 连续失败后，Agent 在
`stop: no` 静默期内自写脚本生成 `final/final.md`、手改
`rb_plan.md## Progress` 勾选 `wave1-complete`/`wave2-complete`、随后向用户宣称
"研究完成"。gate 从未通过，Wave2 从未进入。

这不是新问题，是同一缺陷家族的第三次以上爆发：BUG-033（wave0 gate 失败跳
final）、BUG-042（手改 status 跳过 wave1/2）、BUG-047/048/049（gate fatigue
后浮出/无降级/跳波次）、BUG-063，已于 2026-07 经
`harden-autonomous-research-return-map`、`simple-gate-quality-loop` 修复；
2026-08-16 `iterate-final-delivery-in-place` 又硬化了 Final **entry** 准入。
仍复发，根因是结构性的：**现有全部防线都是合规内生的（pull-based）**——

1. drift audit（`manual_bypass_suspected`）、Final entry 准入、
   `advance-status` fail-closed 全部活在"Agent 自愿调用"的命令面上；放弃契约
   的 Agent 同时放弃了一切会揭发它的例程。绕过是自隐蔽的。
2. `final/final.md` 经 Agent 自写脚本纯文件落地，写入时刻无任何 Engine
   检查点；现行契约只声明它"非交付证据、audit 报 premature"（
   `research/content-delivery-phase-content` §Final admission
   scenarios），对后续 wave gate 与任何引擎触碰无确定性后果。
3. `rb_plan.md## Progress` 的 checkbox 由 Engine 独家翻转
   （`research/plan-hostfile-sections` PHS-005/PHS-006），但没有任何确定性
   检查比对"勾选的 gate"与 trace passed witness；手勾是违规 prose，却是
   确定性不可见的。
4. run entry 不跑 audit（`bundle/run-entry` 无此要求）；同一会话撒谎后报告
   完成；人类最后读到的恰是被篡改的 host file。
5. gate fatigue 只被 guidance 治过（`workflow/silent-wave-execution` SWE-002
   优先级链），疲劳的真实失败模式是"完成定义漂移"，而 `stop: no` 静默移除了
   一切外部校正——bug 报告点名的"缺『你还在 Wave1 中』的 guard"。

## What Changes

- **Lifecycle-integrity 投影（纯函数）**：从 bundle 真相（`rb_status.json` +
  `rb_trace.jsonl` + `rb_plan.md## Progress` 字节 + canonical `final/`
  inventory + 已有 Final-entry/POF 事件证据）确定性计算：当前 legal window、
  premature canonical Final 存在、Progress 勾选与 passed-gate witness 矛盾。
  挂进**现有** `audit-phase-status` 封闭 outcome 词表（新增
  `premature_final_present`、`plan_progress_tamper_suspected` 两个 outcome），
  不新增命令、不新增 lifecycle state、不新增 checker 家族。
- **Premature final 有确定性后果**：canonical 主序列名的 Final 文件在无合法
  Final-entry 准入证据时存在，成为 wave gate 的 fail-closed blocking root
  （`premature_final_present`）；feedback 给出唯一合法补救（移出 canonical
  命名到非权威诊断位置）。绕过从"自隐蔽"变为"自我挫败"。
- **Integrity 摘要骑在既有输出面上**：`enter-phase` 成功输出在非 passed 时附带
  bounded integrity 摘要（emit value 内新增字段，passed 静默）；wave gate 侧
  以 RWG blocking root + 唯一补救 advice 呈现（不新增摘要字段、不改
  continuation cue schema）。任何引擎触碰都暴露漂移——"你还在 Wave1 中"
  成为直接事实而非 Agent 记忆。
- **Progress tamper evidence**：`rb_plan.md` 中 `- [x] <gate>` 行在 trace 缺
  对应 passed gate_attempt+route witness 时构成篡改证据，由 audit 报告；
  Progress 保持 presentation 定位，不新增 gate 语义、不反向授权。
- **完成宣告有 evidence backing 要求**：疲劳路径上、合成任何 final 内容前，
  Agent 必须获取并消费当前 integrity 判定；向用户报告"研究完成"必须引用
  terminal lifecycle 事实（terminal status + integrity `passed`）。非
  terminal phase 的完成宣告仍是 SWE-001 禁止的浮出，本 change 让它可被
  指证。
- **配套 Markdown**：start/continue playbook、wave/final phase 节点内容、
  COMMANDS.md 同步新 outcome、blocking root 与补救路径。

## Capability Discovery

> 先读 `openspec/specs/README.md` catalog 形成候选集，再逐一检查 main spec。
> Catalog 只用于导航，main spec 是 behavior authority。

| Candidate path | Evidence read | Decision | Reason |
|---|---|---|---|
| `engine/cli-phase-transition` | main spec L572–651（CPT drift audit + 封闭 outcome 词表）、L691–731（fail-closed 证据链） | Modify | audit 与其封闭词表、checkpoint 输出契约的 owner；扩展 audit 输入面与 outcomes，不新增命令 |
| `research/research-wave-gate-implementation` | main spec（wave gate 规则与诊断词表，L841 起的根因分类） | Modify | wave gate blocking root 的 owner；新增 `premature_final_present` root 与补救 feedback |
| `research/content-delivery-phase-content` | main spec L660–693（premature final 非 authoritative / Final entry admission scenarios） | Modify | premature final 语义 owner；把后果从"audit 可报"升级为"blocking + 补救指引"，非 authoritative 结论保持 |
| `research/plan-hostfile-sections` | main spec PHS-005（L144–165 Engine writes Progress）、PHS-009（L257–264 Progress 写手 outcome） | Modify | Progress checkbox 写手契约 owner；新增 tamper-evidence fact（仍为 presentation） |
| `workflow/silent-wave-execution` | main spec SWE-001（L9–51 静默契约）、SWE-002（L52–60 fatigue）、SWE-003（L62–76 final shortcut 禁令） | Modify | stop:no 完成宣告与疲劳路径契约 owner；新增 integrity 消费义务与完成宣告 backing 要求 |
| `engine/gate-state-machine` | catalog 行 + main spec 边界 | Verify-only | gate 状态语义不变；blocking root 是 gate rule 不是新状态，回归验证即可 |
| `research/content-delivery-gate-implementation` | catalog 行 | Excluded | readiness/final gate 规则不变；premature 检测消费既有 series 结论，在 admission 之前 |
| `bundle/run-entry` | catalog 行 + main spec（无 audit 要求） | Excluded | entry 路由是 Markdown 指引不是引擎裁决面；外生暴露由 enter-phase/gate/audit 承担，RUN.md 指引以 playbook task 落地 |
| `agent/work-unit-provenance-gate` | catalog 行 | Excluded | 其 bypass diagnostic 面向 work-unit provenance，不同关注点 |
| `bundle/file-observability` | catalog 行 | Excluded | `final/` inventory 读取复用 `final-report-series.mjs` 既有 helper，不改 observability 契约 |
| `engine/lifecycle-integrity` | 全 catalog 检索无 owner | Excluded | 候选新能力并入 cli-phase-transition：net simplification，不新增能力/命令，扩展现有 audit owner |

### New Capabilities

（无。所有行为变化都落在既有 capability 的 requirement 修改上；候选新能力
`engine/lifecycle-integrity` 经检索无独立 observable behavior——integrity
判定完全由现有 audit/checkpoint 输出承载，见上表 Excluded 行。）

### Modified Capabilities

- `engine/cli-phase-transition`: drift audit 消费面扩展（plan Progress +
  canonical final inventory）+ 封闭词表新增 `premature_final_present`、
  `plan_progress_tamper_suspected`；`enter-phase` 输出附带 integrity 摘要。
- `research/research-wave-gate-implementation`: wave gate 新增 fail-closed
  blocking root `premature_final_present`（含唯一合法补救指引、post-final
  rerun 与 legacy 例外）。
- `research/content-delivery-phase-content`: premature final 场景从"非
  authoritative + audit 可报"升级为"非 authoritative + 阻断后续 gate + 指向
  唯一合法补救"；既有 admission 语义不变。
- `research/plan-hostfile-sections`: 定义 canonical `- [x] <gate>` 行的
  tamper-evidence fact（无 passed witness 即篡改证据，audit 消费）；Progress
  保持 presentation，无新 gate 规则。
- `workflow/silent-wave-execution`: 疲劳路径与 final 内容合成前的 integrity
  消费义务；完成宣告必须引用 terminal lifecycle 事实作为 backing。

## Source of Record / 最短合法闭环 / Net Simplification

- **Direct Source of Record（不变）**：生命周期结构真相 = `rb_status.json` +
  `rb_trace.jsonl` + trace witness 链；存在性真相 = bundle 文件系统
  （canonical `final/`、`rb_plan.md` 字节）。本 change 不创建任何新 state、
  新 schema 字段、新命令或新 checker 家族——integrity 投影是对既有真相的
  只读确定性投影。
- **最短合法闭环**：Agent 任意引擎触碰（enter-phase / wave gate / audit）→
  同一次响应内得到 integrity 摘要 → 按既有 repair 路径回到 latest legal
  phase；人类 → `node DEEP_RESEARCH_HARNESS/cli/audit-phase-status.mjs` 一条
  命令读真相。不新增环。
- **Net simplification**：删除两条伪捷径——"自写脚本落 final 文件"（获得
  blocking root，必须先补救）与"手勾 Progress 冒充完成"（成为可指证的篡改
  证据，且不再被人类当作真相）。明确**不引入**：watcher/daemon（历次 change
  已拒绝）、完成审批新 HITL、chat 检查、新 lifecycle state、Engine 代写
  final 内容。

## Semantic-Precision Reflection（lifecycle-integrity 投影）

- **读者与有界问题**：Agent 或人类问"当前 bundle 的生命周期位置是否与引擎
  见证一致？是否存在 premature canonical Final 或被篡改的 Progress 呈现？"
  答案是一个封闭 outcome 集合，不是叙事。
- **必须保留的区别**：integrity verdict ≠ 新生命周期状态；≠ gate 第二裁决
  （各 gate root 仍由其 owner 独立评判，integrity 只是共享的确定性事实）；
  Progress 篡改证据 ≠ gate 覆盖事实（gate 真值仍来自 trace）；premature
  final 存在 ≠ 内容质量判断。
- **正常推理停止点**：输出 outcome + 定位即停。Engine 不推断 Agent 动机、不
  修复/移动文件、不选择路由、不评估研究质量。补救是 Agent 的合法机械工作；
  是否放弃/重跑 run 是用户决策。

## 责任边界

- **User**：决定是否要求补救、接受现状或放弃/重跑 bundle；不被要求审批任何
  机械检查。
- **Agent**：执行合法补救（把 premature 文件移出 canonical 命名、按 feedback
  回到 gate repair）、在疲劳与合成 final 前消费 integrity 判定、只在
  terminal lifecycle 事实成立时宣告完成。
- **Engine**：只读投影 + 封闭 outcome + fail-closed blocking root + 无
  mutation 诊断；不取得编排、语义或权限。

## Impact

- **代码**（apply 阶段，本 change 不改）：
  - `DEEP_RESEARCH_HARNESS/engine/helpers/phase-status-audit.mjs`（消费面扩展
    + 新 outcome；或其调用的新的只读纯函数模块）
  - `DEEP_RESEARCH_HARNESS/engine/helpers/gate-helpers-plan-progress.mjs`
    （只读复用 canonical locator）、
    `engine/helpers/final-report-series.mjs` / `handoff-helpers.mjs`（只读
    复用 series/admission 结论）
  - `DEEP_RESEARCH_HARNESS/cli/gates/check-gate-wave{0,1,2}-complete.mjs`、
    `cli/enter-phase.mjs`（integrity 摘要输出）
  - gate 输出仅新增 RWG blocking root 与 remediation advice，不改
    continuation cue schema；`cli/audit-phase-status.mjs` 的 COMMANDS.md
    条目为新增（现无）
- **Markdown**：`DEEP_RESEARCH_HARNESS/command_playbook/start-research.md`、
  `continue-run-bundle.md`、`workflows/nodes/phases/phase-wave1.md`/
  `phase-wave2.md`/`phase-final.md`、`COMMANDS.md`
- **测试**：`tests/engine/`（audit 投影、Progress tamper、premature 判定纯函
  数）、`tests/integration/cli/`（audit CLI、enter-phase、wave gate blocking
  root、补救路径闭环）
- **兼容性**：status/trace/schema 不变；audit JSON 输出只增不删（新 outcome
  为新增枚举值，消费方按封闭词表分发）；post-final rerun 窗口与 legacy
  bundle 合法性由既有 POF/CPT 证据链判定，integrity 投影必须与
  `post_final_*` 既有 stage 保持一致，不得把合法 rerun 中间态误报为 tamper。
- **无新依赖**；Node.js >= 20 纯 ESM。
