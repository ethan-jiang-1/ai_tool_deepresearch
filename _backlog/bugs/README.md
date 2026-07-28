# Active Bugs — 活跃 bug 列表

> 最后更新: 2026-07-28 | `_backlog/bugs/` — 活跃 bug 在此
>
> **bug 编号权威在 `_done/_fixed_bugs/`，新 bug = 最大编号 + 1。** 本文件只列活跃 bug。

## 修完一个 bug 的步骤

1. `git mv bugs/BUG-<NNN>-<slug>.md _done/_fixed_bugs/BUG-<NNN>-<slug>.md`
2. 更新 `_done/_fixed_bugs/README.md`（加表格行 + 更新 Next available bug ID）
3. 更新本文件（删掉该 bug）
4. 更新 `../_done/README.md`（计数 +1）

---

## 活跃列表

> **当前优先级：没有已验证的活跃 P1 implementation defect。** 先通过真实 bundle 让 work-unit、evidence-production 与 Gate 路径稳定、可重复运行；只对由该运行产生的 fresh direct root 提出下一个 change。下表的 P2/P3 卡不能替代这项运行证据。

| Bug | Severity | Phase | 简述 |
|-----|----------|-------|------|
| [BUG-099](BUG-099-stop-no-agent-halted-at-wave0.md) | P2 | wave0 | deferred operability：`stop: no` phase agent 在 wave0 主动停下，当前可由一次用户续跑恢复，不阻塞核心 bundle contract 可达性 |
| [BUG-103](BUG-103-status-gate-drift-between-phases.md) | P3 | 跨 phase | rb_status.json gate 字段在 phase transition 后持续漂移，需手动 advance-status |
| [BUG-104](BUG-104-enter-phase-context-pollution.md) | P2 | 跨 phase | enter-phase 每次渲染完整 shared context 造成累积 context 压力 |
| [BUG-106](BUG-106-stop-no-violation-repeats-agent-reports-instead-of-executes.md) | P2 | wave0→wave1 | deferred operability：agent 输出总结而未执行下一 phase，当前可由一次用户续跑恢复 |
| [BUG-129](BUG-129-wave1-ref-materialization-same-bypass.md) | P2 | wave1 | I1 dormant：仅当前真实 bundle 证明 Wave1 submitted-backed projection 仍被错误拒绝时，才开启有界 repair change |
| [BUG-130](BUG-130-wave2-pure-synthesis-vs-gate-contradiction.md) | P2 | wave2 | I2 dormant：仅当前真实 bundle 证明 Wave2 pure-synthesis 的既有证据链仍被错误拒绝时，才开启有界 repair change |
| [BUG-131](BUG-131-degraded-pass-inconsistency-wave2-vs-wave0-wave1.md) | P2 | wave2 | accepted residual risk：Wave2 无 eligible degradation 的 pre-HITL2 deadlock 仍按既有 policy fail-closed；非当前 authorized change |
| [BUG-134](BUG-134-wave2-inspect-misclassifies-synthesis-ledger-as-return-map.md) | P2 | wave2 | inspect 把 synthesis/ledger 当成 seed return-map，迫使合法 artifact 增加非契约 Return Map workaround |
| [BUG-135](BUG-135-terminal-readiness-does-not-set-run-state-completed.md) | P2 | final | readiness 已通过且 next_gate 为 none，但 rb_status.json 的 state 仍为 not_started |

> BUG-099/103/104/106 不在 Wave execution/gate remediation 范围内，由 [`silent-autonomous-execution`](../plans/silent-autonomous-execution.md) 计划承接，均 deferred 于核心 work-unit / evidence / Gate 运行路径稳定之后。

**Next available bug ID: BUG-139**

## BUG-132–137 接手地图

这些卡来自两次真实 bundle run，不是一个可用“补几个 Markdown”关闭的单一问题。
所有 framework 修复都必须先走 OpenSpec propose/explore，再按批准 task apply；当前
bundle 的 evidence、ledger、receipt、trace 不能为方便修复而手改。

| Workstream | Bugs | 建议入口 | 不能误关的边界 |
| --- | --- | --- | --- |
| Seed projection completeness | BUG-132 (closed) | `work-unit-projection.mjs`、`return-map.mjs` | `make-wave0-candidate-projection-complete` 已归档：一个当前 source-array position 对应一个 exact candidate coordinate，不新增 evidence authority。 |
| Wave1 reference materialization | BUG-133 / BUG-136 / BUG-137 (fixed) | `phase-wave1.md`、reference convergence/index sync、existing queue demand | v0.55 closes canonical identity, index synchronization, and true-deficit objective without a new controller or evidence authority. |
| Wave2 return-map scope | BUG-134 | `inspect-wave2-output.mjs`、`inspectWaveArtifactReturnMaps` | 缩小 phase-artifact validator 的输入，不能删除 seed Wave2 projection 检查或以 phase-artifact workaround 掩盖该检查 |
| Terminal lifecycle | BUG-135 | `advance-status.mjs`、RunState schema | 只修 terminal state atomicity，不重定义所有中间 `state` 或破坏 post-final recovery |

每张卡末尾的“接手信息”列出已运行的 red loop（或明确记录当前是缺失的 false-pass
seam）、owner、non-goal 与 regression completion criteria。下一位 Agent 应先读相关
卡的这一节，再决定是否将相邻卡放进同一个有界 change。

### 活态重验约定

卡片中的 bundle 证据是发现时的 runtime snapshot；bundle 本身可以在不改 framework
的情况下继续被合法 materialize、repair 或加入 workaround。接手时先重跑卡中命令，
并把当前结果与卡片快照区分开：一个已变绿的 mutable bundle 不能单独关闭“缺少
deterministic repair path / evaluator scope”的 framework bug；相反，不能复现时应先
把历史最小情形做成 disposable fixture，再决定 proposal 的边界。

## 最近关闭 (2026-07-27)

## 最近关闭 (2026-07-28)

| Bug | 结案依据 |
|-----|----------|
| BUG-138 | `fix-seed-topic-projection-materialization` 已 archive（commit `9953435a3`）：route-bound packet writer 原子 materialize owned Seed Topic slots，template 与 command protocol 分离，inspect/gate 共用 direct readiness；验收为静态契约和确定性 production-CLI Wave 链，不保留嵌套 Agent-flow 测试负债。 |
| BUG-132 | `make-wave0-candidate-projection-complete` 已 archive：Wave0 当前 `source.yaml` 的每个已验证数组位置都须有 exact `<work_id>/<ordinal>` entry 或 deferred disposition；65/65 focused checks、7/7 version checks 与 package/governance/strict validation 通过。 |
| BUG-133 / BUG-136 / BUG-137 | `converge-wave1-reference-projections` 已 archive（v0.55）：canonical submitted-backing Wave1 projection convergence、all-family CAS index sync、以及 true-deficit supplementary objective；56 focused unit/integration checks 和 routing/requirements/spec governance 均通过。 |

## 最近关闭 (2026-07-27)

以下记录已移入 [`../_done/_fixed_bugs/`](../_done/_fixed_bugs/)；总收口、D1 policy 与 I1/I2 的未来触发条件见 [CLS-037](../_done/_closed_plans/evidence-production-and-phase-projection-boundaries.md)：

| Bug | 结案依据 |
|-----|----------|
| BUG-124 | `align-wave0-shared-reference-guidance`（v0.52）修正 Phase Agent guidance/repair feedback，并覆盖合法 submitted shared-reference producer 路径 |
| BUG-125 | `converge-queue-demand-admission` 统一 enqueue/check/claim 的 current-facts admission，并扩展现有 stale repair |
| BUG-126 / BUG-127 | `canonical-seed-authoring` 建立唯一 structured `enrich_seed` writer、canonical binding 与 authoring feedback |
| BUG-128 | D1 明确保留 `claim_verification` 的 `6 + 2 x topics` floor，接受其 eligible-degradation 成本；这是产品 policy 结案，不新增 producer/threshold change |

## 最近关闭 (2026-07-25)

以下记录已移入 [`../_done/_fixed_bugs/`](../_done/_fixed_bugs/)；完整的 authority/disposition 边界见 [`../_done/_closed_plans/delegated-work-operability-and-gate-truth.md`](../_done/_closed_plans/delegated-work-operability-and-gate-truth.md)：

| Bug | 结案依据 |
|-----|----------|
| BUG-114 / BUG-115 | `make-delegated-work-contracts-constructible` 已归档；真实 actor 行为保留为 `NOT_RUN`，不作伪造证明 |
| BUG-116 / BUG-119 / BUG-122 | 新鲜 disposable-bundle queue evidence 与 current focused regressions 未复现历史 defect |
| BUG-117 | provenance Gate 的 fail-closed 是正确的 integrity boundary，不建立 degraded bypass |
| BUG-118 | `make-terminal-work-replacement-direct` 已归档，提供 terminal snapshot -> successor demand -> normal claim 路径 |
| BUG-120 | `make-wave-producer-contract-and-closeout-direct` 已交付 Wave1 reference guidance；真实 `case-225` 保留为独立内容验证，不作为未修 bug |
| BUG-121 | 高 attempt 下修正 direct fact 后，当前 Gate evaluation 未复现 stale verdict |
| BUG-123 | supplementary Wave1 `claim -> submit -> Gate` 已通过，新增 immutable row 满足新 source，而非修改历史 declaration |

## 最近关闭 (2026-07-24)

BUG-100–102、105、107–113（共 11 个）随 Wave execution and gate remediation 三个 OpenSpec change 全部 archive 关闭，已移入 [`../_done/_fixed_bugs/`](../_done/_fixed_bugs/)：

| Bug | Change | Commit | 收口 |
|-----|--------|--------|------|
| BUG-100 / 101 / 102 | `make-pre-wave-readiness-feedback-direct` | `542f7833a` | pre-Wave readiness（access probe / topic-state apply / seed YAML）前移到唯一合法 producer 路径 |
| BUG-105 / 107 / 108 / 111 / 112 | `make-wave-producer-contract-and-closeout-direct` | `d65fe538a` | producer 契约 + dry-submit→formal submit + Phase-owned closeout；canonical/rich/backing 分离诊断 |
| BUG-109 / 110 / 113 | `simplify-wave-gate-feedback-and-degradation-policy` | `6e47de3ea` | 最小独立根因投影 + 共享 metadata-backed degradation policy；BUG-110 既有 fail-closed 正确，仅回归锁定 |

完整 review context：[`../_done/_closed_plans/wave-execution-and-gate-remediation.md`](../_done/_closed_plans/wave-execution-and-gate-remediation.md)。

## 最近关闭 (2026-07-20)

| Bug | Change | 简述 |
|-----|--------|------|
| BUG-092 | `restore-section-scoped-seed-projection-contract` (v0.35, `af5e6018c`) | Wave inspect 改为目标 section 隔离校验，并逐条绑定 current-round row/finding；原跨 section false pass 已有 unit、CLI integration 与 deterministic E2E 证据 |
| BUG-093 | `centralize-seed-topic-authoring-contracts` (v0.36, `29c90d0c1`) | Shared seed/return-map authoring contracts and renderer parity close the real definition-drift issue; headers and historical bundles remain unchanged, and consumed tokens are normal terminal state |
| BUG-094 | `centralize-seed-topic-authoring-contracts` (v0.36, `29c90d0c1`) | Canonical rerun direction is atomically published and structurally checked; legacy presentation remains tolerated and guidance semantics stay Agent-owned |
| BUG-095 | `harden-bundle-creator-arguments` (v0.37, `7ad92777b`) | disposable/production creator 在写入前严格解析 argv；`--help` 零写入，非法参数早期拒绝，literal target path 以 argument vector 验证 |

---

## 最近批量修复 (2026-07-15)

BUG-081 … BUG-089 随 `repair-rerun-added-topic-bootstrap` archive（`80d0c9e83`，v0.28）关闭：

| Bug | 简述 | 收口 |
|-----|------|------|
| BUG-081 | `add_topic` seed 骨架过薄 | 完整 canonical seed renderer + wave tokens |
| BUG-082 | rerun 新 topic 缺 Wave0 work-unit provenance | 走 normal queue → claim → submit → gate |
| BUG-083 | claim 混淆 delegated / empty / fallback | root-first claim diagnostic |
| BUG-084 | submit 交叉校验难手工满足 | Result Starter + dry-submit roots + repair surface |
| BUG-085 | reference_format 拒 `related_topic_uid` | 统一 UID/legacy binding adapter |
| BUG-086 | isCountable 与模板 section 不一致 | count 只读 accepted + parseable URL |
| BUG-087 | depth-review 重抄 ledger cache trails | Engine 从 reviewed submitted rows 派生 |
| BUG-088 | output declarations 不可恢复 | `recover-declaration` hash-identical 恢复 |
| BUG-089 | submit 拒 prior submitted source_ref | same topic/wave/kind authorized prior role |

后续 `seed-backfill-round-continuity` 处理多轮 projection authority（非上述编号关闭范围）。`formalize-verification-routing` 只定测试路由，不关业务 bug。

### 最近批量修复 (2026-07-13)

BUG-079 / BUG-080 随 C1–C5 路线全部 archive 后关闭：
- **BUG-079**: C1 可检测隐形 topic/drift，C3/C5 使新增 scope 只能 canonical-or-blocked，case-317 证明无 addendum 成功路径。历史 addendum 的 adopt 需通过 C3 `migrate_legacy`，不由 C5 自动处理。
- **BUG-080**: 合法 rerun 路径（C5→C3→phase-rerun→seed-topics→wave0→wave1→wave2）已恢复，Agent 走正常 pipeline 时逐 topic seed backfill 和 reference 物化自然执行。add_topic seed body 质量属 Agent guidance 持续改进范围，非 Engine 结构性缺口。

### 最近批量修复 (2026-07-08)

### 第三批 (2026-07-08) — 3 个 OpenSpec change，9 个 bug

| Bug | Change | 简述 |
|-----|--------|------|
| BUG-045 | harden-run-entry-and-bundle-map | deep-research skill 覆盖框架入口路由 |
| BUG-046 | parallel-delegated-phase-execution-and-reference-materialization | Wave0 串行 claim，无并行 |
| BUG-059 | stabilize-work-unit-submit-and-gate-handoff | CLI `--help` 创建垃圾目录 |
| BUG-060 | stabilize-work-unit-submit-and-gate-handoff | sub-agent/Engine contract 系统性 mismatch |
| BUG-061 | harden-run-entry-and-bundle-map | START_FROM_HERE.md 误导性名字和定位 |
| BUG-062 | parallel-delegated-phase-execution-and-reference-materialization | Phase Agent 被动等待不轮询 |
| BUG-063 | stabilize-work-unit-submit-and-gate-handoff | Gate failure 手动修复级联跳过 wave2 |
| BUG-064 | parallel-delegated-phase-execution-and-reference-materialization | Wave1 reference 文件未产出 |
| BUG-065 | parallel-delegated-phase-execution-and-reference-materialization | Wave2 cross-reference 从未产出 |

### 第二批 (2026-07-08) — 3 个 OpenSpec change，12 个 bug

| Bug | Change | 简述 |
|-----|--------|------|
| BUG-044 | stabilize-runtime-position-and-queue | work-unit submit 后 queue stale |
| BUG-047 | simple-gate-quality-loop | stop:no 在 gate fatigue 后浮出水面 |
| BUG-048 | simple-gate-quality-loop | gate 不可通过时无降级推进路径 |
| BUG-049 | simple-gate-quality-loop | Agent 在 gate 卡住后跳过 wave1/wave2 |
| BUG-050 | simple-gate-quality-loop | content_dedup 假阳性 |
| BUG-051 | simple-gate-quality-loop | 手动改 ledger 触发级联 distrust |
| BUG-052 | harden-run-entry-and-bundle-map | Agent 默认使用 Python 而非 Node.js |
| BUG-053 | simple-gate-quality-loop | gate provenance chain 太脆弱 |
| BUG-054 | restore-wave-depth-contracts | Wave1 sub-agent 不做深度发掘 |
| BUG-055 | restore-wave-depth-contracts | Wave2 跳过 cross-topic synthesis |
| BUG-056 | stabilize-runtime-position-and-queue | queue slug derivation 阻止补充 task |
| BUG-057 | stabilize-runtime-position-and-queue | rb_status.json 缺少 current_node |
| BUG-058 | restore-wave-depth-contracts | Wave1 cache trails 太薄 |
