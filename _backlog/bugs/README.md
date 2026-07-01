# Active Bugs

- [BUG-008](BUG-008-agent-breaks-silent-execution-wave1-gate-failure.md) — Agent breaks silent autonomous execution at wave1 gate failure（部分修复：反作弊规则 + gate advice；fatigue counter / stop:no 硬执行 defer）
- [BUG-009](BUG-009-checkCacheCoverage-undefined-workid.md) — ✅ Fixed in `implement-evidence-extraction`
- [BUG-010](BUG-010-production-ledger-missing-required-fields.md) — Production ledger records missing 6 required fields（在 `implement-evidence-extraction` 中修复）
- [BUG-011](BUG-011-subagent-prose-missing-cache-trails-declaration.md) — Sub-agent prose doesn't instruct Agent to populate `cache_trails[]`（Phase 2，在 `implement-evidence-extraction` 中修复）
- [BUG-012](BUG-012-queue-completion-log-events-missing.md) — Queue completion log events missing from run.log（defer，需独立调查 logger 基础设施）

**Next available bug ID: BUG-013**
