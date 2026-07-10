# Active Bugs — 活跃 bug 列表

> 最后更新: 2026-07-09 | `_backlog/bugs/` — 活跃 bug 在此
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
| [BUG-069](BUG-069-silent-autonomous-execution-unreachable-contract-not-self-sufficient.md) | P1 | "静默自主执行"不可达（根因 meta-bug）：Agent-facing 契约（phase MD + emitted schema）不自洽/不完整，每个 wave 首过失败都要读 Engine 源码逆向才能修 |
| [BUG-071](BUG-071-missing-search-capability-contract-and-graceful-degradation.md) | P1 | 研究波次无"检索能力契约"：框架假设实时联网检索却从不预检，离线/沙箱/代理环境下 wave0 静默卡死、无 fail-fast、无降级、无阻塞交还面（共发现 bootstrap `current_gate` 协议漂移次生缺陷） |
| [BUG-072](BUG-072-agent-surfaces-after-gate-pass-violates-stop-no-contract.md) | P1 | Agent 在 gate pass 后因上下文压力主动浮出水面、提议跳过剩余 phase，违反 `stop: no` 契约——非契约漂移，而是行为违规 |
| [BUG-074](BUG-074-agent-surfaces-after-wave0-gate-pass-stop-no-anatomy.md) | P1 | BUG-072 的独立 run 复现（`anatomy` bundle）：Agent 在 wave0 **clean** gate pass 后因 scope 压力浮出水面做"深度 vs 速度"checkpoint（明知契约仍理性化违反）；新增诊断——`log-event --surfacing-intent` 逃生口只在 RUN.md、未出现在任何 phase §8，压力下不可达 |
| [BUG-075](BUG-075-wave1-gate-contract-wall-provenance-format-ref-floor.md) | P1 | Wave1 gate contract 墙：研究实质完成（5 单元/~32 新源/32 ref/5 depth-review）但首过 19 规则全挂，皆 provenance/format/floor 技术性（evidence-summary 链接 regex、depth-review is_new_vs_wave0、cache-mapping、ref-floor=8 可达性）——BUG-069 的 wave1 实例 + 这些检查不在 submit preflight |

> **2026-07-09 复核**：症状实例 BUG-066 / 067 / 068 / 070 已逐条对照代码核实**已修**并移入 `_done/_fixed_bugs/`（见各 bug 文件 + 对应 OpenSpec change：`stabilize-agent-facing-work-unit-contracts` v0.12、`align-gate-contracts-and-reference-navigation` v0.13、`harden-delegated-preflight-and-fetch-hygiene` v0.14）。**BUG-069 作为根因 meta-bug 留在活跃列表**：其「Agent 必须读引擎源码」的核心症状已被 `operate-work-unit dry-submit` preflight（一次性批量返回所有违规）+ submit 侧 auto-normalize（`normalizations[]`）大幅缓解；但根因的**结构性收口未完成**——`result.schema.json` 仍是手写、未从 `.strict()` Zod 生成（无 single source）、且 phase-doc ↔ validator 一致性测试只覆盖 queue 面、未覆盖 work-unit envelope 面（`WorkUnitResultSchema`/`output_contract`/`source_claims`）。即「下一次同类漂移无测试拦截」的根因面仍敞开。是否视为已修、或拆成更窄的 follow-up，待定。

**Next available bug ID: BUG-076**

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
