# Active Bugs — 活跃 bug 列表

> 最后更新: 2026-07-05 | `_backlog/bugs/` — 活跃 bug 在此
>
> **bug 编号权威在 `_done/_fixed_bugs/`，新 bug = 最大编号 + 1。** 本文件只列活跃 bug。

## 修完一个 bug 的步骤

1. `git mv bugs/BUG-<NNN>-<slug>.md _done/_fixed_bugs/BUG-<NNN>-<slug>.md`
2. 更新 `_done/_fixed_bugs/README.md`（加表格行 + 更新 Next available bug ID）
3. 更新本文件（删掉该 bug）
4. 更新 `../_done/README.md`（计数 +1）

---

## 活跃列表

- [BUG-020](BUG-020-phase-agent-self-halts-delivers-premature-report.md) — Phase Agent 自我中止并提前交付报告（P0）
- [BUG-021](BUG-021-research-style-params-null-bypasses-quality-thresholds.md) — research_style_params: null 通过 schema 但静默禁用所有质量阈值（P1）
- [BUG-022](BUG-022-agent-shortcuts-undermine-framework-integrity.md) — Agent 取巧路径破坏框架完整性：progress 漂移、HITL1 绕过、直接 YAML 编辑（P1）
- [BUG-023](BUG-023-hitl1-stop-yes-advisory-only-bypassable.md) — HITL1 `stop: yes` 是 advisory-only——Agent 直接改 YAML 就能绕过（P0）
- [BUG-024](BUG-024-agent-reads-run-md-but-does-free-form-research-instead.md) — Agent 读了 RUN.md 但不执行 §2 流程——做自由研究而非走框架入口（P0）

- [BUG-025](BUG-025-relay-pipeline-too-heavyweight-incentivizes-bypass.md) — Relay pipeline 是 gate 唯一认可的路径但对实际规模研究太重，Agent 取巧绕过后 gate 拒绝（P1）

- [BUG-026](BUG-026-run-log-severely-underrecords-agent-actions.md) — run.log 严重欠记录：几小时研究、139条source、8+sub-agent、4个phase——log里只有11行（P0）

- [BUG-027](BUG-027-cache-empty-relay-bypass-loses-websearch-artifacts.md) — _cache/ 全空：relay bypass 导致所有 WebSearch/WebFetch 产物丢失，8个sub-agent、139条source、零缓存（P0）

- [BUG-028](BUG-028-seed-topic-backfill-perfunctory-bare-pointer.md) — Wave0 seed topic 回填敷衍：裸指针无内容，未来 Agent 无法从 seed topic 恢复研究记忆（P1）

- [BUG-029](BUG-029-no-phase-isolation-agent-contaminates-future-phases.md) — 无 phase 隔离：Agent 在当前 phase 期间可写未来 phase 产物，gate 只检查存在不检查 provenance（P0）← **元 BUG——解释了 BUG-021 到 BUG-028 为什么反复发生**

- [BUG-030](BUG-030-no-subagent-timeout-phase-agent-blocks-indefinitely.md) — 无 sub-agent timeout：Phase Agent 无限期阻塞等待后台 sub-agent，一个卡住整个 pipeline 死（P0）

- [BUG-031](BUG-031-silent-autonomous-execution-stops-agent-idles.md) — 自主静默长程执行失败：Agent 在 stop:no phase spawn sub-agents 后停止，需用户手动"继续"才能恢复（P0）

- [BUG-032](BUG-032-relay-slots-uncommitted-provenance-broken.md) — Relay slots 未 commit：sub-agent 完成但 provenance 链断裂，log 充满 relay_commit_missing，gate 拒绝 pass（P0）

- [BUG-033](BUG-033-phase-isolation-broken-wave0-gate-fail-jumps-to-final.md) — Phase 隔离被破坏：Wave0 gate fail 后 Agent 直接跳到 final report，跳过 wave1/wave2/hitl2/final（P0）

- [BUG-034](BUG-034-wave0-gate-impassable-relay-ledger-chain-too-brittle.md) — Wave0 gate 结构性无法通过：relay→ledger→gate 链 5+ 步骤任一断裂全局阻塞（P0）← **元 BUG——BUG-031/032/033 的根因**

- [BUG-035](BUG-035-cross-wave-repeated-relay-failure-pattern.md) — 每个 relay-based phase 重复同一失败模式：wave0/1/2 共享完全相同的脆弱 relay→ledger→gate 基础设施，无学习效应（P0）← **BUG-034 的乘法效应**

- [BUG-036](BUG-036-run-log-trace-reveal-systemic-workflow-failure.md) — run.log 26.5% WARN rate + rb_trace 19.3% provenance 诊断揭示了系统性 workflow 失败——给后续 AI Coding Agent 的完整根因诊断（P0）

**Next available bug ID: BUG-037**
