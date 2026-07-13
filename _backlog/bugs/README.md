# Active Bugs — 活跃 bug 列表

> 最后更新: 2026-07-13 | `_backlog/bugs/` — 活跃 bug 在此
>
> **bug 编号权威在 `_done/_fixed_bugs/`，新 bug = 最大编号 + 1。** 本文件只列活跃 bug。

## 修完一个 bug 的步骤

1. `git mv bugs/BUG-<NNN>-<slug>.md _done/_fixed_bugs/BUG-<NNN>-<slug>.md`
2. 更新 `_done/_fixed_bugs/README.md`（加表格行 + 更新 Next available bug ID）
3. 更新本文件（删掉该 bug）
4. 更新 `../_done/README.md`（计数 +1）

---

## 活跃列表

_当前无活跃 bug。_

| Bug | 简述 | 状态 |
|-----|------|------|
| [BUG-081](BUG-081-add-topic-generates-minimal-seed-skeleton.md) | `add_topic` 生成 seed 骨架过于简陋 | Open |
| [BUG-082](BUG-082-rerun-new-topic-wave0-no-work-unit-provenance.md) | Rerun 中 add_topic 的新 topic 在 wave0 gate 缺少 work-unit provenance | Open |
| [BUG-083](BUG-083-queue-claim-returns-empty-on-active-window.md) | operate-queue claim 拒绝 delegated item（设计如此）→ 需走 operate-work-unit，但 phase_agent_fallback 被拒 | Open |
| [BUG-084](BUG-084-work-unit-submit-impossible-to-satisfy-manually.md) | operate-work-unit submit 交叉校验字段过多，手工构造 result 不可行 | Open |
| [BUG-085](BUG-085-wave1-gate-reference-format-rejects-uid.md) | Wave1 gate reference_format 拒绝 related_topic_uid | Open |
| [BUG-086](BUG-086-isCountable-requires-core-content-capture.md) | isCountable 要求 ## Core Content Capture——模板用 ## Key Facts | Open |
| [BUG-087](BUG-087-depth-review-source-claims-need-ledger-cache-trails.md) | depth-review source_claim_cache_mapping 要求 cache trail 在 submitted ledger | Open |
| [BUG-088](BUG-088-output-declarations-not-recoverable.md) | rb_output_declarations.jsonl 无法从 index+result 重建 | Open |
| [BUG-089](BUG-089-submit-rejects-source-ref-not-in-output-files.md) | submit 拒绝 source_ref 不在本 WU output_files——阻止 supplementary WU | Open |

**Next available bug ID: BUG-090**

---

## 最近批量修复 (2026-07-13)

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
