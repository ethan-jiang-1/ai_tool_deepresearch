# Design: close-lifecycle-bypass-detection-gap

## Context

参见 proposal.md「Why」。实现现状（2026-09 current head）：

- `DEEP_RESEARCH_HARNESS/engine/helpers/phase-status-audit.mjs` 的
  `auditPhaseStatus(bundlePath)` 返回**单 top-level `outcome`**（封闭词表
  `PHASE_STATUS_AUDIT_OUTCOMES`）并短路返回。已有 premature final 分支：
  `hasFinalFiles()`（`final/` 下任意非隐藏文件即真）+ `legalFinalWindow()`
  （仅认 `readiness_passed` 窗口）不满足时返回 **`status_drift`** 并在
  inspect 里附 premature 提示——没有专属 outcome，且 loose 存在性检查会把
  supplementary/诊断文件误判进来。
- audit 完全不读 `rb_plan.md## Progress`；手勾 checkbox（本 bug 的撒谎载体）
  无任何确定性事实。
- 三个 wave gate CLI（`check-gate-wave{0,1,2}-complete.mjs`）经
  `tryLoadGateDefinition` + 共享 helpers + 各自 contract evaluator 组合出
  blocking roots；无任何 final/ 存在性检查。
- `enter-phase.mjs` 统一经 `emit`（`process.stdout.write(JSON.stringify(...))`）
  输出。
- canonical primary-series 分类已有权威 resolver
  `engine/helpers/final-report-series.mjs`；legal Final-entry 准入与
  post-final 事件解析已有 `engine/helpers/handoff-helpers.mjs` 与
  `inspectPostFinalHandoffStage`（audit 已 import）。Progress 的 canonical
  locator 在 `engine/helpers/gate-helpers-plan-progress.mjs`（PHS-009 写手与
  PHS-009 canonical locator 同源）。

宪法 triad 已在 proposal「Semantic-Precision Reflection」「责任边界」应用；
本 design 不新增层、不新增命令、不新增状态，只把既有 audit/检查点变成
**外生可见**。

## Goals / Non-Goals

**Goals**

1. 同一个只读 integrity 投影同时服务 audit CLI、`enter-phase` 输出、wave gate
   blocking root——一处实现，三处消费。
2. premature final 从 loose 存在性升级为 canonical-series + admission 证据的
   精确判定，并获得专属封闭 outcome `premature_final_present`。
3. Progress tamper 进入 audit 事实面（`plan_progress_tamper_suspected`）。
4. bypass 状态在 bug 场景下自我挫败：写 premature 文件 → 下一次 gate rerun
   必失败且指向唯一合法补救。

**Non-Goals**

- 不引入 watcher/daemon/文件系统监听；检测仍发生在引擎命令面。
- 不新增 lifecycle state、schema 字段、HITL 检查点或 chat 检查。
- 不改变 legal Final admission/POF/rerun 语义（只消费其结论）。
- 不处理 8 个 timed-out work units 的替换（既有 terminal replacement path）。
- 不做历史 bundle 的追溯修复或数据迁移。
- Engine 不移动/删除/重写任何 Agent 文件。

## Decisions

### D1: integrity 投影 = audit helper 内的共享纯函数，输出多事实 `integrity` 对象

现状 audit 是单 outcome 短路。bug 场景中 `premature_final_present` 与
`plan_progress_tamper_suspected` **同时成立**，单 outcome 无法表达。决策：

- 保留 top-level `outcome`/`ok`/`inspect`/`advice`/`diagnostic_only` 结构与
  现有语义（向后兼容：现有消费方与测试不变）；把现 premature 分支的 outcome
  从 `status_drift` 重分类为 **`premature_final_present`**（封闭词表新增项，
  见 D2）。
- 新增 `integrity` 字段收集**全部**非 passed integrity 事实（含与 top-level
  outcome 相同的那条），结构用 Zod schema 定义：

```js
const IntegritySurfaceSchema = z.object({
  kind: z.enum(['plan_progress_line', 'final_file', 'status_window']),
  name: z.string().min(1),          // gate 名 / 文件名 / status window
  detail: z.string().min(1),        // 人读定位（不允许路径逃逸内容）
});
const IntegritySchema = z.object({
  outcomes: z.array(z.enum(PHASE_STATUS_AUDIT_OUTCOMES)).min(1),
  surfaces: z.array(IntegritySurfaceSchema).min(1),
  remediation: z.array(z.string()).default([]), // 每条非 passed 至多一个合法动作
}).superRefine((v, ctx) => { /* outcomes 与 surfaces 一一有据；passed 不入列 */ });
```

- 评估顺序：先跑既有 lifecycle-window 判定链（不改），再独立评估 premature
  presence 与 progress tamper，汇总进 `integrity`。lifecycle-window 非正确，
  top-level `outcome` 仍按现状返回；lifecycle-window passed 而仅
  presence/tamper 命中时，top-level `outcome` 取命中项（新词表成员）。

**备选**：(a) 新建独立 integrity CLI——拒绝：违反 net simplification，命令面
膨胀；(b) 多 top-level outcomes 数组破坏单 outcome 兼容——拒绝：迁移成本高，
消费方全改。

### D2: premature 判定复用权威 resolver，不重写分类

`premature_final_present` 的存在性事实 = `final-report-series.mjs` 的 safe
direct-root 分类（canonical primary-series 命中清单）+ **任一覆盖证据链**：
(i) 当前 lineage 的 CPT-003 Final-entry admission 结论（`handoff-helpers.mjs`），
(ii) 已 admitted 的**历史** lineage 交付证据（含 rerun 进行中的旧 lineage
文件——post-final stage 完成后进入 rerun wave 执行期时，`post_final_*`
短路已不再生效，此证据链防止误伤合法 rerun），
(iii) `inspectPostFinalHandoffStage` 的接受 `post_final_*` 阶段，
(iv) CDP-005 既有 legacy compatibility 结论。
任一覆盖该文件 ⇒ 非 premature。替换现 `hasFinalFiles()` loose 检查；audit
premature 分支不再被 supplementary/诊断文件误触发（现行为是 false-positive
风险，属本次修正的一部分）。

**Source of Record**：canonical Final inventory 结论只来自
`final-report-series.mjs`；准入证据只来自 `handoff-helpers.mjs` /
post-final event parser；本 change 不建立第二分类器。

### D3: progress tamper 判定 = canonical locator 读取 + trace witness 对账

读 `rb_plan.md## Progress`（复用 PHS-009 canonical locator + opaque-region
排除），抽取 canonical `- [x] <gate>` 行；对每行查 trace 中该 gate 的
`gate_attempt(passed=true)` + route-bound `load_complete` witness。无 witness
⇒ tamper surface。gate 名集合来自 handoff topology 的已知 gate enum，非
canonical gate 行一律忽略（不误报用户内容）。Engine Progress 写 `failed` 而
gate 实际 passed 的行 → advisory staleness（inspect 提示，不入
`outcomes`）。

### D4: wave gate blocking root = 共享 helper 注入既有 root-cause 优先反馈

新增 `evaluatePrematureFinalPresence(bundlePath)`（D1 同一纯函数的薄封装，
供 gate 使用，返回 `{hit, surfaces, remediation}`）。三个 wave gate CLI 在
既有规则评估**之前**调用：命中 ⇒ blocking failure，primary advice = D2 同一
remediation 文案（移出 canonical 命名到非权威诊断位置），并按 RWG 既有诊断
词表 root-first 呈现。gate 不写文件。gate definition JSON 不扩 schema——
该 root 是跨 gate 共享的代码规则（与 delegated-bypass diagnostic 同模式）。

**备选**：在三个 gate definition YAML 各加一条 file-pattern 规则——拒绝：
三处重复声明同一语义（违反 simple reliable control 的单点事实），且
definition schema 需扩 file-existence-with-negative-evidence 能力，复杂度
更高。

### D5: enter-phase 输出 = 既有 emit value 追加 bounded `integrity` 摘要

`enter-phase` 在成功 entry 路径上调用同一投影；非 passed ⇒ emit value 追加
`integrity`（D1 schema 子集：`outcomes` + `surfaces` + 指向 audit CLI 的
提示行）。passed ⇒ 不输出（零噪音）。**不改变 entry verdict**：entry 合法性
仍只由 handoff 证据决定；integrity 是"过去的漂移"，不阻断"合法的下一步"
（阻断发生在 wave gate 的 root 上）。

**备选**：integrity 命中即拒绝 enter-phase——拒绝：会把合法下一步堵死、
制造新的死路（Agent 在 wave1 gate 失败期间正是靠 enter-phase 消费
handoff），违反 helper-oriented 的最短合法闭环。

### D6: 指令面（SWE/PHS/playbook）只做 guidance 与 doc-lock

完成宣告 backing、疲劳路径 consumption 是 Agent guidance 义务（SWE-007），
用 phase/playbook 文档 + 既有 static guidance validation（doc-lock 测试）
锁定；Engine 不检查 chat（SWE-005 不变）。

## Risks / Trade-offs

- **[误报] canonical 判定把合法补充文件当 premature** → D2 三证据源覆盖；
  integration 测试含 supplementary/legacy/post-final 中间态反例。
- **[兼容] 现测试断言 premature 场景为 `status_drift`** → 任务显式翻转这些
  断言并保留行为差分说明；`integrity` 为新增可选字段，旧消费方不受影响。
- **[噪声] enter-phase 每次输出摘要** → 仅非 passed 才输出；passed 静默。
- **[规避回归] Agent 改用其它非 canonical 文件名"完成交付"** → 交付事实只
  认 canonical publication（不变）；非 canonical 文件依旧非权威——bypass
  的"收益"本就是欺骗人类读者，本 change 堵的是「canonical 命名 + Progress
  勾选」这两个具体撒谎载体，chat 层欺骗按 SWE-007 backing 要求治理。
- **[性能] audit 多读 plan + final 目录** → 两者皆小文件、单次 readdir/读，
  无量级风险。

## Migration Plan

1. 纯增量实施：新增 outcome 常量、`integrity` 字段、共享 helper、三个 gate
   接线、enter-phase 摘要、文档。
2. 翻转 premature 分支 outcome（`status_drift` → `premature_final_present`）
   与对应测试为唯一行为变更点。
3. 回滚 = revert 单个 change 提交；无数据迁移、无 schema 变更、历史 bundle
   只读兼容（legacy compatibility 分支保持）。

## Open Questions

无——premature 文件移出的**具体非 canonical 命名**（如
`final/attic-<原名的诊断名>`）属实现细节，task 内定并锁测试；不影响 spec
语义（只要求"canonical primary-series 命名之外 + 非权威"）。
