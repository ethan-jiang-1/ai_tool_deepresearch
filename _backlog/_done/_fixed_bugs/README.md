# Fixed Bugs Index — 已修复 bug 归档

> 最后更新: 2026-07-08 | `_backlog/_done/_fixed_bugs/` — 已修复 bug 的归档目录。
> 接收来自 [`../../bugs/`](../../bugs/) 的 bug。`_` 前缀 = coding agent 默认忽略。
>
> **本目录是 bug 编号的唯一权威来源——新 bug 的编号 = 本目录最大编号 + 1。**

## 接收一个修完的 bug

bug 修完后从 `_backlog/bugs/` 通过 `git mv` 移入本目录：
1. 在本文件表格加一行（ID + Date + Title）
2. 更新下面的 "Next available bug ID"
3. 更新 `../../bugs/README.md`（删掉该 bug）
4. 更新 `../README.md`（计数 +1）

---

| ID | Date | Title |
|----|------|-------|
| BUG-001 | 2026-06-26 | rb_status.json next_gate stale after seed-topics insertion |
| BUG-002 | 2026-06-26 | No CLI to emit phase trace or advance status |
| BUG-003 | 2026-06-26 | Seed topics naming lacks numeric ordering prefix |
| BUG-004 | 2026-06-26 | Wave1 ref naming convention vs gate glob mismatch |
| BUG-005 | 2026-06-28 | Fake reference files bypass gate content_dedup |
| BUG-006 | 2026-06-28 | Task card controller field allows bypassing subagent dispatch |
| BUG-007 | 2026-06-29 | Rerun incremental topic — shallow content integration |
| BUG-008 | 2026-07-01 | Agent breaks silent execution on wave1 gate failure |
| BUG-009 | 2026-07-01 | checkCacheCoverage undefined workId |
| BUG-010 | 2026-07-01 | Production ledger missing required fields |
| BUG-011 | 2026-07-01 | Subagent prose missing cache trails declaration |
| BUG-012 | 2026-07-01 | Queue completion log events missing |
| BUG-013 | 2026-07-02 | Gate failure fatigue causes Agent to violate stop:no contract |
| BUG-014 | 2026-07-03 | Phase Agent bypasses sub-agent relay (P0, BUG-006 regression) |
| BUG-015 | 2026-07-03 | Wave gate quality rules too strict — non-relay output structurally rejected |
| BUG-016 | 2026-07-03 | Agentic Queue cross-bundle contamination via Agent context |
| BUG-017 | 2026-07-03 | Trace/log system not self-contained for gate failure diagnosis |
| BUG-018 | 2026-07-03 | Wave0 gate repair whack-a-mole + Sub-agent YAML sanitization |
| BUG-019 | 2026-07-04 | Main Agent leaks search noise via relay/infrastructure fight |
| BUG-020 | 2026-07-05 | Phase Agent self-halts, delivers premature report (P0) |
| BUG-021 | 2026-07-05 | research_style_params: null bypasses quality thresholds (P1) |
| BUG-022 | 2026-07-05 | Agent shortcuts undermine framework integrity (P1) |
| BUG-023 | 2026-07-05 | HITL1 stop:yes advisory-only, bypassable via YAML edit (P0) |
| BUG-024 | 2026-07-05 | Agent reads RUN.md but does free-form research instead (P0) |
| BUG-025 | 2026-07-05 | Relay pipeline too heavyweight, incentivizes bypass (P1) |
| BUG-027 | 2026-07-05 | _cache/ empty — relay bypass loses WebSearch/WebFetch artifacts (P0) |
| BUG-029 | 2026-07-06 | No phase isolation — meta-bug explaining BUG-021~028 (P0) |
| BUG-031 | 2026-07-06 | Silent autonomous execution stops, Agent idles (P0) |
| BUG-033 | 2026-07-06 | Phase isolation broken — wave0 gate fail jumps to final report (P0) |
| BUG-037 | 2026-07-07 | Sub-agent writes leak to project root (P1) |
| BUG-038 | 2026-07-07 | source.yaml format undocumented, 5 attempts to get right (P1) |
| BUG-039 | 2026-07-07 | Sub-agent does not write output files, returns chat text only (P1) |
| BUG-040 | 2026-07-07 | Sub-agent invents receipt_nonce instead of reading _beacon.json (P2) |
| BUG-041 | 2026-07-07 | Shared refs not in ledger — gate blind to direct-written files (P2) |
| BUG-042 | 2026-07-07 | Phase Agent bypasses wave1/wave2, skips to HITL2 (P0) |
| BUG-043 | 2026-07-07 | Phase Agent surfaces at non-HITL phase to show findings (P0) |
| BUG-044 | 2026-07-08 | work-unit submit 成功后 queue.delegated_in_flight 残留，后续 item 无法 claim |
| BUG-047 | 2026-07-08 | stop:no phase 在 gate fatigue 后浮出水面，违反静默自主执行合约 |
| BUG-048 | 2026-07-08 | Gate 不可通过时框架无降级推进路径，stop:no 与 gate contract 死锁 |
| BUG-049 | 2026-07-08 | Phase Agent 在 gate 卡住后跳过 wave1/wave2 直接合成 final report |
| BUG-050 | 2026-07-08 | content_dedup gate rule 对合法文章 URL 产生假阳性 |
| BUG-051 | 2026-07-08 | 手动修改 ledger 触发 gate 级联 distrust，越修越坏 |
| BUG-053 | 2026-07-08 | Gate provenance chain 过于脆弱，单一文件缺失触发全链 distrust |
| BUG-054 | 2026-07-08 | Wave1 sub-agent 只做数据综合不做深度发掘，Phase Agent 照单全收 |
| BUG-055 | 2026-07-08 | Wave2 Phase Agent 跳过 cross-topic synthesis 计算，直接产出浅层报告 |
| BUG-056 | 2026-07-08 | Queue slug derivation 阻止同一 topic 创建补充 task |
| BUG-057 | 2026-07-08 | rb_status.json 缺少 current_node 字段，无法确定当前执行的 phase node |
| BUG-058 | 2026-07-08 | Wave1 cache trails 太薄，每个 topic 只有 1-2 个 cache dir |

**Next available bug ID: BUG-059**

---

## Suspended (未修复，仍在排查)

这些 bug 仍在 `../_suspened_bugs/`，尚未确认修复：

| ID | Date | Title |
|----|------|-------|
| BUG-026 | 2026-07-05 | run.log severely under-records Agent actions (P0) |
| BUG-028 | 2026-07-05 | Seed topic backfill perfunctory — bare pointer, zero substance (P1) |
| BUG-030 | 2026-07-06 | No sub-agent timeout — Phase Agent blocks indefinitely (P0) |
