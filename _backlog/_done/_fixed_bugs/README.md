# Fixed Bugs Index — 已修复 bug 归档

> 最后更新: 2026-07-28 | `_backlog/_done/_fixed_bugs/` — 已修复 bug 的归档目录。
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
| BUG-079 | 2026-07-13 | Out-of-gate addendum topics — C1 detects, C3/C5 canonical-or-blocked, no addendum success path |
| BUG-080 | 2026-07-13 | Rerun seed backfill quality — legal rerun path restored, normal pipeline backfill/materialization applies |
| BUG-081 | 2026-07-15 | add_topic 生成 seed 骨架过薄 — complete canonical seed renderer + wave tokens（repair-rerun-added-topic-bootstrap v0.28） |
| BUG-082 | 2026-07-15 | Rerun 新 topic Wave0 缺 work-unit provenance — normal queue/claim/submit/gate path |
| BUG-083 | 2026-07-15 | queue claim 混淆 delegated / empty window / fallback — root-first claim diagnostic |
| BUG-084 | 2026-07-15 | work-unit submit 交叉校验难手工满足 — Result Starter + dry-submit roots + repair surface |
| BUG-085 | 2026-07-15 | Wave1 reference_format 拒 related_topic_uid — 统一 UID/legacy binding adapter |
| BUG-086 | 2026-07-15 | isCountable 要求 Core Content Capture 与模板 Key Facts 不一致 — count 只读 accepted + parseable URL |
| BUG-087 | 2026-07-15 | depth-review 要求重抄 ledger cache trails — Engine 从 reviewed submitted rows 派生 |
| BUG-088 | 2026-07-15 | rb_output_declarations.jsonl 不可恢复 — recover-declaration hash-identical 恢复 |
| BUG-089 | 2026-07-15 | submit 拒 prior submitted source_ref — same topic/wave/kind authorized prior role |
| BUG-090 | 2026-07-16 | Rerun 新增 topic 未物化 reference/*.md — **结案: cross-version skew，当前版本不复现，不修**（症状层→`bundle-version-skew-advisory` CMI-007/RRD-011；根因 audit→CLS-026） |
| BUG-091 | 2026-07-16 | Legacy rerun artifact 旧格式过当前 gate — **结案: cross-version skew，不修**（`source_novelty_floor` 规则已删；不建迁移机器） |
| BUG-092 | 2026-07-20 | `add_topic` seed projection 跨 section masking — `restore-section-scoped-seed-projection-contract` v0.35 按目标 section 逐 row/finding 执法 |
| BUG-093 | 2026-07-20 | Seed-topic appendix/return-map authoring drift — shared authoring contracts + renderer parity；不改 header、不迁移历史 bundle |
| BUG-094 | 2026-07-20 | Rerun direction section has no canonical template — atomic topic-state publication + structural readiness；legacy read remains tolerant |
| BUG-095 | 2026-07-20 | `new-disposable-bundle.mjs` 把 `--help` 当 bundle 名并创建垃圾目录；v0.37 pre-write argv boundary 同时覆盖 production creator |
| BUG-096 | 2026-07-21 | WebSearch / WebFetch 或等价页面读取受阻；两条 implementation path 已 archive，delegated fallback observation 保留为 `UNOBSERVED` |
| BUG-097 | 2026-07-21 | 非 HITL boundary surfacing observation；现有 silent contract/cues 已覆盖，未发现值得新增 deterministic remediation 的直接缺口 |
| BUG-098 | 2026-07-21 | Wave1 actor contract delivery；v0.40 已交付，real first-return observation 保留为 `NOT_RUN` |
| BUG-100 | 2026-07-24 | Research access probe "first result only" 假阴性 — `make-pre-wave-readiness-feedback-direct`（`542f7833a`）把 access probe 收敛为 bounded neutral observation |
| BUG-101 | 2026-07-24 | Phase instruction 与 Engine gate 对 topic-state apply 时序矛盾 — `make-pre-wave-readiness-feedback-direct` 幂等的合法 pre-Wave route |
| BUG-102 | 2026-07-24 | Seed topic YAML 校验只在 gate 执行 — `make-pre-wave-readiness-feedback-direct` 前移到 authoring owning checkpoint |
| BUG-105 | 2026-07-24 | raw `source.yaml`、rich-reference content、canonical path、backing 被混淆 — `make-wave-producer-contract-and-closeout-direct`（`d65fe538a`）分离诊断 |
| BUG-107 | 2026-07-24 | depth-review.yaml 创建责任不明 — `make-wave-producer-contract-and-closeout-direct` Phase-owned reference/depth closeout |
| BUG-108 | 2026-07-24 | Seed topic `__BACKFILL_*__` token 替换无 owner — `make-wave-producer-contract-and-closeout-direct` Phase-owned return-map closeout |
| BUG-109 | 2026-07-24 | Wave1 gate 规则过度耦合（35+ masked sub-rules 淹没 root cause）— `simplify-wave-gate-feedback-and-degradation-policy`（`6e47de3ea`）最小独立根因投影 |
| BUG-110 | 2026-07-24 | Wave1 fatigue degradation — 既有窄 fail-closed 正确；`simplify-...` 回归锁定并迁入共享 policy（不放宽 Wave1） |
| BUG-111 | 2026-07-24 | canonical path、rich content 与 submitted backing 被混淆 — `make-wave-producer-contract-and-closeout-direct` 分离诊断 |
| BUG-112 | 2026-07-24 | Wave1 returned-work path 跳过 existing dry-submit — `make-wave-producer-contract-and-closeout-direct` 直接 dry-submit→submit 链 |
| BUG-113 | 2026-07-24 | Wave2 adapter 缺 shared degradation policy — `simplify-...` 三 Wave adapter 共用 metadata-backed evaluator；本次 ineligible roots 仍 fail closed |
| BUG-114 | 2026-07-25 | Actor-observation tuple contract 可发现、malformed input 有结构化反馈 — `make-delegated-work-contracts-constructible`；真实 actor 观察仍为 `NOT_RUN` |
| BUG-115 | 2026-07-25 | Generated Completion Contract 收口 returned-work authoring facts — `make-delegated-work-contracts-constructible`；真实 actor 观察仍为 `NOT_RUN` |
| BUG-116 | 2026-07-25 | 结案：fresh queue CLI protocol evidence 未复现历史 stdout/stderr 成功路径错误 |
| BUG-117 | 2026-07-25 | 结案：provenance/receipt/ledger roots 正确 fail-closed；不提供 unsafe degraded bypass |
| BUG-118 | 2026-07-25 | Terminal snapshot 到一次 successor demand 的合法路径 — `make-terminal-work-replacement-direct` |
| BUG-119 | 2026-07-25 | 结案：Wave1 assignment-mode admission 的拒绝不变更与有效入队均有当前回归证明 |
| BUG-120 | 2026-07-26 | Wave1 reference guidance delivery 已由 `make-wave-producer-contract-and-closeout-direct`（`d65fe538a`）修复；12 项静态 guidance/case-225 contract 回归通过。真实 `case-225` 仍可作为独立内容验证，不作为本缺陷未修依据 |
| BUG-121 | 2026-07-25 | 结案：修正 direct fact 后的高 attempt Gate 重跑未复现 stale `failed_rule_ids` |
| BUG-122 | 2026-07-25 | 结案：有效 enqueue 后 queue health/stop projection 重新计算；不需要 raw unblock |
| BUG-123 | 2026-07-25 | 结案：supplementary Wave1 `claim -> submit -> Gate` 建立新 immutable ledger row；不提供 amend/re-hash API |
| BUG-124 | 2026-07-27 | Wave0 shared-reference repair hint misdirected the Phase Agent; v0.52 aligns guidance with the legal submitted producer |
| BUG-125 | 2026-07-27 | Queue payload validation occurred only at claim; current-facts admission now converges enqueue/check/claim |
| BUG-126 | 2026-07-27 | Seed-topic YAML hand-authoring and Engine parsing could diverge; canonical structured enrichment owns the mutable fields |
| BUG-127 | 2026-07-27 | Exact `must_answer` canonical-binding contract was not signaled during seed authoring |
| BUG-128 | 2026-07-27 | Wave0 shared-reference floor is retained as an explicit `claim_verification` product policy with eligible degradation |
| BUG-132 | 2026-07-28 | Wave0 source-array candidates were covered only at parent work-id granularity; current exact `<work_id>/<ordinal>` projection coverage now shares one direct-output and readiness path with inspect/gate |
| BUG-138 | 2026-07-28 | Wave completion did not materialize correct seed-topic backfill; `fix-seed-topic-projection-materialization` introduced the authority-bound projection writer, template/protocol boundary, shared readiness evaluator, and deterministic Wave-chain regression |
| BUG-133 | 2026-07-28 | Wave1 reference floor deficit now converges through the existing supplementary demand only after projection/index repair |
| BUG-136 | 2026-07-28 | Reference inventory now has deterministic all-family CAS synchronization |
| BUG-137 | 2026-07-28 | Wave1 current coverage now uses a canonical full-topic-slug submitted-backing locator |
| BUG-134 | 2026-07-28 | Wave2 synthesis and ledger artifacts no longer enter the Seed Topic return-map parser; their independent contracts retain ownership |

**Next available bug ID: BUG-139**

---

## Suspended (未修复，仍在排查)

这些 bug 仍在 `../_suspened_bugs/`，尚未确认修复：

| ID | Date | Title |
|----|------|-------|
| BUG-026 | 2026-07-05 | run.log severely under-records Agent actions (P0) |
| BUG-028 | 2026-07-05 | Seed topic backfill perfunctory — bare pointer, zero substance (P1) |
| BUG-030 | 2026-07-06 | No sub-agent timeout — Phase Agent blocks indefinitely (P0) |
