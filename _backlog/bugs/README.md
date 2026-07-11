# Active Bugs — 活跃 bug 列表

> 最后更新: 2026-07-11 | `_backlog/bugs/` — 活跃 bug 在此
>
> **bug 编号权威在 `_done/_fixed_bugs/`，新 bug = 最大编号 + 1。** 本文件只列活跃 bug。

## 修完一个 bug 的步骤

1. `git mv bugs/BUG-<NNN>-<slug>.md _done/_fixed_bugs/BUG-<NNN>-<slug>.md`
2. 更新 `_done/_fixed_bugs/README.md`（加表格行 + 更新 Next available bug ID）
3. 更新本文件（删掉该 bug）
4. 更新 `../_done/README.md`（计数 +1）

---

## 活跃列表

| Bug | 简述 | 状态 |
|-----|------|------|
| [BUG-076](BUG-076-webfetch-domain-verification-blocks-research-fetch.md) | `WebFetch` 对所有外部域名报 "Unable to verify if domain is safe to fetch"，HITL1 research access probe 无法达到 `available` | Active — `curl` workaround 已确认可用；框架级修复待定 |
| [BUG-077](BUG-077-subagent-api-402-and-cache-trail-schema-opaque.md) | Wave0 delegated subagent 全部 402（balance>0 限制）；且 `operate-work-unit submit` 的 cache-trail schema 未文档化、校验报错不透明 | Active — 阻塞 delegated work-unit 提交路径 |
| [BUG-078](BUG-078-post-final-hitl2-rerun-reentry-blocked.md) | Final 交付后无法回到 HITL2 做 rerun：`enter-phase`/gate `handoff_preflight` 只认 trace 最新 handoff（单向棘轮），而手写 trace event 被禁止——文档承诺的 post-final rerun 无 CLI 可达 | Active — 需框架级 reopen 机制 |
| [BUG-079](BUG-079-out-of-gate-addendum-no-canonical-footprint.md) | Out-of-gate addendum 新增 topic 无 canonical footprint：数据落 `_cache/addendum/` 私有命名空间，`artifacts/wave0\|1`、registry、trace 全无记录，gate/audit/recovery 看不见；gate advice 还给出被棘轮挡回的死循环建议 | Active — BUG-078 的下游结构后果；需 gated rerun 或 addendum 正式化 + 一致性审计 |

**Next available bug ID: BUG-080**

> **2026-07-11 批量修复**：BUG-069 / 071 / 072 / 073 / 074 / 075 已按 [`bugs-069-075-openspec-change-slicing`](../_done/_closed_plans/bugs-069-075-openspec-change-slicing.md) 聚成 3 个 OpenSpec change 修复并移入 `_done/_fixed_bugs/`：
> - **A** `simplify-and-reuse-wave-contract-checks` (v0.17) → BUG-069 / 073 / 075（同源 side-effect-free inspect 预检 Wave contract）
> - **B** `fail-fast-on-missing-research-access` (v0.18) → BUG-071（HITL1 `research_access` probe fail-fast）
> - **C** `put-continuation-cues-at-decision-points` (v0.19) → BUG-072 / 074（决策点 continuation cue；机制落地，行为待真实 run 观察）
>
> **两个遗留项（未混入本批，另行跟踪）**：
> - BUG-071 §4.1 bootstrap `current_gate` 语义统一 → deferred，见 plan §6，未来独立小 change `normalize-bootstrap-gate-window`。
> - BUG-072 / 074 的 LLM 行为闭环需真实 disposable run 观察，静态测试只证明 cue 可达与取值正确。

**Next available bug ID: BUG-076**

---

## 最近批量修复 (2026-07-08)

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
