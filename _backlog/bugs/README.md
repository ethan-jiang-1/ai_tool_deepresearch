# Active Bugs — 活跃 bug 列表

> 最后更新: 2026-07-08 | `_backlog/bugs/` — 活跃 bug 在此
>
> **bug 编号权威在 `_done/_fixed_bugs/`，新 bug = 最大编号 + 1。** 本文件只列活跃 bug。

## 修完一个 bug 的步骤

1. `git mv bugs/BUG-<NNN>-<slug>.md _done/_fixed_bugs/BUG-<NNN>-<slug>.md`
2. 更新 `_done/_fixed_bugs/README.md`（加表格行 + 更新 Next available bug ID）
3. 更新本文件（删掉该 bug）
4. 更新 `../_done/README.md`（计数 +1）

---

## 活跃列表

- [BUG-045](BUG-045-deep-research-skill-overrides-framework.md) — Agent 优先调用内置 deep-research skill 而非 DPT_FRAMEWORK，无视 CLAUDE.md 抑制指令
- [BUG-046](BUG-046-wave0-serial-claim-no-parallelism.md) — Wave0 source intake 串行执行，5 个独立 topic 无法并行加速
- [BUG-059](BUG-059-cli-positional-help-creates-junk-directory.md) — operate-queue/operate-work-unit CLI 把 `--help` 当 bundle 名，在 repo root 创建垃圾目录
- [BUG-060](BUG-060-subagent-output-contract-mismatch-systematic.md) — Sub-agent 产出物与 Engine contract 之间的系统性 mismatch：5 个独立 gap（result.json 包装、receipt 字段缺失、cache 命名、nonce 双源、source_claims contract/gate 矛盾）导致 gate 反复卡在格式问题而非研究质量
- [BUG-061](BUG-061-start-from-here-misleading-name-and-positioning.md) — START_FROM_HERE.md 名字（应为 BUNDLE_MAP.md）和定位（应为被动知识地图而非动作入口）都有误导性
- [BUG-062](BUG-062-phase-agent-passive-waiting-no-polling.md) — Phase Agent spawn sub-agent 后被动等待 task-notification 推送，不主动轮询文件系统，导致 sub-agent 已完成但 Agent 空等，需用户敲"继续"才推进
- [BUG-063](BUG-063-gate-failure-cascade-skips-phase-wave2.md) — Gate failure 手动修复级联：wave0 gate 失败 → 手动改 status → handoff chain 断裂 → wave1 gate 无法运行 → 再次手动改 → wave2 被完全跳过（cross-topic synthesis 丢失）
- [BUG-064](BUG-064-wave1-reference-files-not-produced.md) — Wave1 sub-agent 不产出 topic-specific reference 文件：5 个 topic 只有 1 个写了 reference，其余 4 个 reference/ 为空
- [BUG-065](BUG-065-wave2-cross-reference-files-never-produced.md) — Wave2 cross-topic reference 文件从未被产出：两条路径（delegated/pure synthesis）之间存在 responsibility gap，`00-cross-*.md` 全部缺失

**Next available bug ID: BUG-066**

---

## 最近批量修复 (2026-07-08)

以下 12 个 bug 已通过 3 个 OpenSpec change 修复，移入 `_done/_fixed_bugs/`：

| Bug | Change | 简述 |
|-----|--------|------|
| BUG-044 | stabilize-runtime-position-and-queue | work-unit submit 后 queue stale |
| BUG-047 | simple-gate-quality-loop | stop:no 在 gate fatigue 后浮出水面 |
| BUG-048 | simple-gate-quality-loop | gate 不可通过时无降级推进路径 |
| BUG-049 | simple-gate-quality-loop | Agent 在 gate 卡住后跳过 wave1/wave2 |
| BUG-050 | simple-gate-quality-loop | content_dedup 假阳性 |
| BUG-051 | simple-gate-quality-loop | 手动改 ledger 触发级联 distrust |
| BUG-053 | simple-gate-quality-loop | gate provenance chain 太脆弱 |
| BUG-054 | restore-wave-depth-contracts | Wave1 sub-agent 不做深度发掘 |
| BUG-055 | restore-wave-depth-contracts | Wave2 跳过 cross-topic synthesis |
| BUG-056 | stabilize-runtime-position-and-queue | queue slug derivation 阻止补充 task |
| BUG-057 | stabilize-runtime-position-and-queue | rb_status.json 缺少 current_node |
| BUG-058 | restore-wave-depth-contracts | Wave1 cache trails 太薄 |

剩余 3 个（BUG-045, 046, 052）等待 `harden-run-entry-and-agent-discipline` change。
