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

| Bug | 严重级别 | 简述 |
|-----|---------|------|
| [BUG-066](BUG-066-work-unit-result-schema-contradicts-strict-validator.md) | P1 | work-unit envelope `result.schema.json` 与 submit `.strict()` validator 矛盾（wave0 广告禁用字段 / wave1 `source_claims.items` 零约束），delegated 首次 submit 系统性失败；BUG-060 残留 |
| [BUG-067](BUG-067-phase-seed-topics-work-id-template-drift.md) | P2 | `phase-seed-topics.md` task-card/result 模板仍用废弃的 `work_id` 队列身份；hygiene 守卫存在但只扫 `rb_queue.json.tmpl`，覆盖不到 phase MD |
| [BUG-068](BUG-068-wave1-role-set-inconsistency-and-depth-review-ref-drift.md) | P1 | Wave1：`output_contract.allowed_roles` 含 `other` 但 coverage gate 拒绝它，且 submitted 后 role 不可修正（须整只 supplementary work unit）；depth-review ref 文档示例带多余尾斜杠与 exact-match validator 冲突 |
| [BUG-069](BUG-069-silent-autonomous-execution-unreachable-contract-not-self-sufficient.md) | P1 | "静默自主执行"不可达：Agent-facing 契约（phase MD + emitted schema）不自洽/不完整，每个 wave 首过失败都要读 Engine 源码逆向才能修；BUG-066/067/068 均为其症状 |
| [BUG-070](BUG-070-seed-topic-map-refs-not-resolvable-to-reference-files.md) | P1 | seed_topics 信息地图的 `refs` 无法按图索骥到 `reference/` 具体文件：回填指向 `artifacts/`/`_cache/`/`_work_units/` 内部产物、`reference/` 引用用 glob 通配（`-*.md（N 个）`）、大量条目零 reference 引用；`return-map.mjs` 校验把 reference 仅当可接受面之一、不强制不枚举不校验存在性 |

> 四者同源：**契约/文档形状 ≠ gate/validator 要求，且无一致性测试拦截**（BUG-069 为根因，066/067/068 为症状实例）。均发现于 `dpt_rb_martin-fowler-ai-sdlc-retreats` 正式 run（2026-07-08，exploratory_map，5 topics）。BUG-070 同 run 复盘产出，属「reference 层作为一等导航目标未被契约强制」族（与 BUG-064/065 呼应）。

**Next available bug ID: BUG-071**

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
