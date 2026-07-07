# Active Bugs — 活跃 bug 列表

> 最后更新: 2026-07-07 | `_backlog/bugs/` — 活跃 bug 在此
>
> **bug 编号权威在 `_done/_fixed_bugs/`，新 bug = 最大编号 + 1。** 本文件只列活跃 bug。

## 修完一个 bug 的步骤

1. `git mv bugs/BUG-<NNN>-<slug>.md _done/_fixed_bugs/BUG-<NNN>-<slug>.md`
2. 更新 `_done/_fixed_bugs/README.md`（加表格行 + 更新 Next available bug ID）
3. 更新本文件（删掉该 bug）
4. 更新 `../_done/README.md`（计数 +1）

---

## 活跃列表

- [BUG-044](BUG-044-queue-stale-after-work-unit-submit.md) — work-unit submit 成功后 queue.delegated_in_flight 残留，后续 item 无法 claim
- [BUG-045](BUG-045-deep-research-skill-overrides-framework.md) — Agent 优先调用内置 deep-research skill 而非 DPT_FRAMEWORK，无视 CLAUDE.md 抑制指令
- [BUG-046](BUG-046-wave0-serial-claim-no-parallelism.md) — Wave0 source intake 串行执行，5 个独立 topic 无法并行加速
- [BUG-047](BUG-047-stop-no-phase-surfaces-on-gate-fatigue.md) — `stop: no` phase 在 gate fatigue 后浮出水面，违反静默自主执行合约
- [BUG-048](BUG-048-gate-deadlock-no-degraded-advance-path.md) — Gate 不可通过时框架无降级推进路径，`stop: no` 与 gate contract 死锁
- [BUG-049](BUG-049-agent-skips-to-final-when-gate-stuck.md) — Phase Agent 在 gate 卡住后跳过 wave1/wave2 直接合成 final report
- [BUG-050](BUG-050-content-dedup-false-positive-homepage-url.md) — `content_dedup` gate rule 对合法文章 URL 产生假阳性
- [BUG-051](BUG-051-manual-ledger-edit-triggers-cascading-distrust.md) — 手动修改 ledger 触发 gate 级联 distrust，越修越坏
- [BUG-052](BUG-052-agent-defaults-to-python-instead-of-node.md) — Agent 在纯 Node.js 项目中默认使用 Python 做数据操作
- [BUG-053](BUG-053-gate-provenance-chain-too-brittle-cascade.md) — Gate provenance chain 过于脆弱，单一文件缺失触发全链 distrust
- [BUG-054](BUG-054-wave1-sub-agent-shallow-no-new-discovery.md) — Wave1 sub-agent 只做数据综合不做深度发掘，Phase Agent 照单全收
- [BUG-055](BUG-055-wave2-phase-agent-skips-synthesis-depth.md) — Wave2 Phase Agent 跳过 cross-topic synthesis 计算，直接产出浅层报告
- [BUG-056](BUG-056-queue-slug-derivation-blocks-supplementary-tasks.md) — Queue slug derivation 阻止同一 topic 创建补充 task
- [BUG-057](BUG-057-rb-status-json-missing-current-node.md) — `rb_status.json` 缺少 `current_node` 字段，无法确定当前执行的 phase node
- [BUG-058](BUG-058-wave1-cache-trails-too-thin-per-topic.md) — Wave1 cache trails 太薄，每个 topic 只有 1-2 个 cache dir，远低于 wave0 的 5-13 个

**Next available bug ID: BUG-059**
