# Fixed Bugs Index — 已修复 bug 归档

> 最后更新: 2026-07-07 | `_backlog/_done/_fixed_bugs/` — 已修复 bug 的归档目录。
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

**Next available bug ID: BUG-044**

---

## Suspended (未修复，仍在排查)

这些 bug 仍在 `../_suspened_bugs/`，尚未确认修复：

| ID | Date | Title |
|----|------|-------|
| BUG-026 | 2026-07-05 | run.log severely under-records Agent actions (P0) |
| BUG-028 | 2026-07-05 | Seed topic backfill perfunctory — bare pointer, zero substance (P1) |
| BUG-030 | 2026-07-06 | No sub-agent timeout — Phase Agent blocks indefinitely (P0) |
