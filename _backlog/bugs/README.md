# Active Bugs — 活跃 bug 列表

> 最后更新: 2026-07-23 | `_backlog/bugs/` — 活跃 bug 在此
>
> **bug 编号权威在 `_done/_fixed_bugs/`，新 bug = 最大编号 + 1。** 本文件只列活跃 bug。

## 修完一个 bug 的步骤

1. `git mv bugs/BUG-<NNN>-<slug>.md _done/_fixed_bugs/BUG-<NNN>-<slug>.md`
2. 更新 `_done/_fixed_bugs/README.md`（加表格行 + 更新 Next available bug ID）
3. 更新本文件（删掉该 bug）
4. 更新 `../_done/README.md`（计数 +1）

---

## 活跃列表

| Bug | Severity | Phase | 简述 |
|-----|----------|-------|------|
| [BUG-099](BUG-099-stop-no-agent-halted-at-wave0.md) | P1 | wave0 | `stop: no` phase agent 因 context exhaustion 在 wave0 主动停下，创建 de-facto HITL |
| [BUG-100](BUG-100-research-access-probe-first-result-false-negative.md) | P2 | hitl1 | Research access probe "first result only" 规则在搜索面正常时造成假阴性 |
| [BUG-101](BUG-101-topic-state-apply-sequencing-contradiction.md) | P2 | hitl1 | Phase instruction 与 Engine gate 对 topic-state apply 的时序要求矛盾 |
| [BUG-102](BUG-102-seed-topic-yaml-validation-at-gate-not-authoring.md) | P3 | seed-topics | Seed topic YAML 校验只在 gate 执行，不在 authoring/enrichment 时反馈 |
| [BUG-103](BUG-103-status-gate-drift-between-phases.md) | P3 | 跨 phase | rb_status.json gate 字段在 phase transition 后持续漂移，需手动 advance-status |
| [BUG-104](BUG-104-enter-phase-context-pollution.md) | P2 | 跨 phase | enter-phase 每次渲染完整 shared context 造成累积 context 压力 |
| [BUG-105](BUG-105-shared-ref-gate-yaml-in-code-fence-not-parsed.md) | P2 | wave0 | Shared ref gate 无法解析 Markdown code fence 内的 YAML，count=0 |
| [BUG-106](BUG-106-stop-no-violation-repeats-agent-reports-instead-of-executes.md) | P1 | wave0→wave1 | stop: no violation 再现 — agent 输出总结但不执行下一 phase |

| [BUG-107](BUG-107-wave1-depth-review-phase-agent-responsibility-unclear.md) | P2 | wave1 | depth-review.yaml 创建责任不明确 — sub-agent 不创建，Phase Agent 遗漏 |
| [BUG-108](BUG-108-seed-token-backfill-responsibility-gap.md) | P3 | wave1 | Seed topic __BACKFILL_*__ token 替换无明确 owner |
| [BUG-109](BUG-109-wave1-gate-excessive-rule-coupling.md) | P3 | wave1 | Wave1 gate 规则过度耦合 — 35+ masked sub-rules 淹没 root cause |
| [BUG-110](BUG-110-wave1-gate-no-fatigue-degradation.md) | P2 | wave1 | Wave1 gate 无 fatigue degradation — 6 attempts 无 pass/degrade 出口 |

**Next available bug ID: BUG-111**

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
