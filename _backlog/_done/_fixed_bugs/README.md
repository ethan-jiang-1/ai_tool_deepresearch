# Fixed Bugs Index

已修复 bug，按编号顺序排列。bug 修完后从 [`../../bugs/`](../../bugs/) 移入本目录。

**本目录是 bug 编号的唯一权威来源——新 bug 的编号 = 本目录最大编号 + 1。**

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

**Next available bug ID: BUG-014**
