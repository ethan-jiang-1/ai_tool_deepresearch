# Fixed Bugs Index — 已修复 bug 归档

> 最后更新: 2026-07-13 | `_backlog/_done/_fixed_bugs/` — 已修复 bug 的归档目录。
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
| BUG-052 | 2026-07-08 | Agent 在纯 Node.js 项目中默认使用 Python 做数据操作 |
| BUG-045 | 2026-07-08 | Agent 优先调用内置 deep-research skill 而非 DPT_FRAMEWORK，无视 CLAUDE.md 抑制指令 |
| BUG-046 | 2026-07-08 | Wave0 source intake 串行执行，5 个独立 topic 无法并行加速 |
| BUG-059 | 2026-07-08 | operate-queue/operate-work-unit CLI 把 `--help` 当 bundle 名，在 repo root 创建垃圾目录 |
| BUG-060 | 2026-07-08 | Sub-agent 产出物与 Engine contract 之间的系统性 mismatch：5 个独立 gap |
| BUG-061 | 2026-07-08 | START_FROM_HERE.md 名字和定位误导性，迁移到 BUNDLE_MAP.md |
| BUG-062 | 2026-07-08 | Phase Agent spawn sub-agent 后被动等待，不主动轮询文件系统 |
| BUG-063 | 2026-07-08 | Gate failure 手动修复级联导致 wave2 被完全跳过 |
| BUG-064 | 2026-07-08 | Wave1 sub-agent 不产出 topic-specific reference 文件 |
| BUG-065 | 2026-07-08 | Wave2 cross-topic reference 文件从未被产出 |
| BUG-066 | 2026-07-08 | work-unit envelope `result.schema.json` 与 submit `.strict()` validator 矛盾：wave0 广告禁用字段、wave1 source_claims.items 零约束，delegated 首次 submit 系统性失败 |
| BUG-067 | 2026-07-08 | `phase-seed-topics.md` task-card/result 模板用废弃 `work_id` 队列身份；hygiene 守卫存在但只扫 `rb_queue.json.tmpl`、覆盖不到 phase MD |
| BUG-068 | 2026-07-08 | Wave1 `output_contract.allowed_roles` 含 `other` 但 coverage gate 拒绝（且 submitted 后不可修正）；depth-review ref 文档示例带尾斜杠与 exact-match validator 冲突 |
| BUG-069 | 2026-07-10 | 静默自主执行不可达（根因 meta-bug）：Agent-facing 契约不自洽、wave 首过失败需读 Engine 源码逆向；由 `simplify-and-reuse-wave-contract-checks` (v0.17) 用同源 side-effect-free inspect 预检 Phase-owned artifact 契约收口 |
| BUG-070 | 2026-07-08 | seed_topics 信息地图 `refs` 无法解析到 `reference/` 具体文件：指向内部 build 产物 / glob 通配 / 零 reference 引用；`return-map.mjs` 校验过宽松且 diagnosticOnly |
| BUG-071 | 2026-07-11 | 研究波次无检索能力契约，离线/沙箱/代理环境下 wave0 静默卡死；由 `fail-fast-on-missing-research-access` (v0.18) 在 HITL1 用 `research_access` probe fail-fast（§4.1 bootstrap `current_gate` 协议漂移次生缺陷另记 deferred → 未来 `normalize-bootstrap-gate-window`） |
| BUG-072 | 2026-07-11 | Agent 在 gate pass 后因上下文压力浮出、提议跳过剩余 phase，违反 `stop: no`；由 `put-continuation-cues-at-decision-points` (v0.19) 在决策点追加极短 continuation cue（机制落地；LLM 实际是否浮出待真实 run 观察裁决） |
| BUG-073 | 2026-07-10 | Wave2 finding-index 契约需读 Engine 源码；随 `simplify-and-reuse-wave-contract-checks` (v0.17) 用同源 inspect 返回最小根因 + 修正 `shared-schemas.md` 字段数漂移 |
| BUG-074 | 2026-07-11 | BUG-072 的 wave0 clean gate pass 复现（`anatomy` bundle）+ `surfacing-intent` 逃生口不可达；随 `put-continuation-cues-at-decision-points` (v0.19) 关闭（机制落地；行为待真实 run 观察） |
| BUG-075 | 2026-07-10 | Wave1 gate contract 墙（19 规则全为 provenance/format/floor 技术性失败）；随 `simplify-and-reuse-wave-contract-checks` (v0.17) 削减为必要 blocker + 同源 preflight 可达 |
| BUG-076 | 2026-07-12 | Native WebFetch host domain verification remains external; framework now accepts a real alternative fetch surface such as `curl` for HITL1 research access and delegated fetch fallback |
| BUG-077 | 2026-07-12 | Role-bound actor preflight prevents doomed delegated allocation; explicit single Phase Agent fallback remains inside formal submit and actor provenance authority |
| BUG-078 | 2026-07-13 | Audited Final-lineage-bound rerun recovery reaches the existing canonical rerun pipeline without hand-written authority or addendum namespace |

**Next available bug ID: BUG-080**

---

## Suspended (未修复，仍在排查)

这些 bug 仍在 `../_suspened_bugs/`，尚未确认修复：

| ID | Date | Title |
|----|------|-------|
| BUG-026 | 2026-07-05 | run.log severely under-records Agent actions (P0) |
| BUG-028 | 2026-07-05 | Seed topic backfill perfunctory — bare pointer, zero substance (P1) |
| BUG-030 | 2026-07-06 | No sub-agent timeout — Phase Agent blocks indefinitely (P0) |
