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
- [BUG-052](BUG-052-agent-defaults-to-python-instead-of-node.md) — Agent 在纯 Node.js 项目中默认使用 Python 做数据操作
- [BUG-059](BUG-059-cli-positional-help-creates-junk-directory.md) — operate-queue/operate-work-unit CLI 把 `--help` 当 bundle 名，在 repo root 创建垃圾目录

**Next available bug ID: BUG-060**

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
