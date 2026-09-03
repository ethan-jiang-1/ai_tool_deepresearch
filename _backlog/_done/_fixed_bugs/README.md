# Fixed Bugs Index — 已修复 bug 归档

> 最后更新: 2026-08-24 | `_backlog/_done/_fixed_bugs/` — 已修复 bug 的归档目录。
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
| BUG-135 | 2026-07-28 | Normal readiness-to-Final status transaction now commits the authoritative completed lifecycle state while preserving rollback and post-final recovery |
| BUG-103 | 2026-07-28 | `start-research` now delivers the accepted `enter-phase -> source-gate advance-status -> execute` handoff order; lifecycle writers remain intentionally separate |
| BUG-104 | 2026-08-08 | Current-head no-reproduction: default `enter-phase` emits a bounded presentation; complete closure requires explicit `--full` |
| BUG-139 | 2026-07-29 | DPT-selected research entry contract now explicitly routes before generic research shortcuts; host-level matcher suppression remains residual |
| BUG-140 | 2026-07-29 | DPT-selected research entry contract now prohibits pre-entry ad-hoc search/fetch/synthesis; host tool availability remains residual |
| BUG-141 | 2026-07-29 | Wave Gate public verdict is mutually exclusive across blocking failure, clean pass, and degraded handoff |
| BUG-143 | 2026-07-31 | HITL1 semantic research-access adapter boundary; selected host availability remains honest `NOT_RUN` |
| BUG-146 | 2026-07-31 | Wave0 rich-reference and return-map evaluator contract collision |
| BUG-148 | 2026-07-31 | Structured concurrent work-unit submit contention and legal rerun boundary |
| BUG-150 | 2026-07-31 | Wave0 inspect help invocation no longer enters bundle evaluation |
| BUG-151 | 2026-07-31 | Wave0 supplementary source contribution provenance drift |
| BUG-152 | 2026-07-31 | Topic-state projection upsert preserves adjacent entries |
| BUG-153 | 2026-07-31 | Topic-state validation exposes direct field-level feedback |
| BUG-154 | 2026-07-31 | Canonical seed initialization prevents body duplication after edit |
| BUG-155 | 2026-07-31 | Plan-hostfile section operation is discoverable through the public contract |
| BUG-156 | 2026-07-31 | Bounded phase-entry presentation preserves the next action cue |
| BUG-157 | 2026-07-31 | Research-style projection freshness has one legal writer loop |
| BUG-158 | 2026-07-31 | Context-dependent topic-state schemas are discoverable at the operation boundary |
| BUG-159 | 2026-07-31 | Advance-status ordering is delivered at the phase action point |
| BUG-160 | 2026-07-31 | Selected Engine CLIs expose standalone help and invocation feedback |
| BUG-162 | 2026-07-31 | Wave1 artifact return-map parser collision |
| BUG-170 | 2026-07-31 | Actor canary checkpoint no longer conflates submit with Phase Gate readiness; host completion remains `NOT_RUN` |
| BUG-171 | 2026-07-31 | Claim actor reason-code feedback exposes the direct legal action |
| BUG-172 | 2026-07-31 | Reference metadata grammar and evaluator scope are aligned |
| BUG-173 | 2026-07-31 | Generated Completion Contract exposes cache-trail requirements at the authoring point |
| BUG-174 | 2026-07-31 | Phase/Actor attempt ownership collision has an audited successor path |
| BUG-176 | 2026-07-31 | Projection reference validation supplies an exact owner and repair coordinate |
| BUG-177 | 2026-07-31 | Timeout preflight returns recommendation basis for the direct branch |
| BUG-178 | 2026-07-31 | Reentry audit shares Phase-owned reference authority with the Wave Gate |
| BUG-179 | 2026-07-31 | Ledger hash drift uses declaration recovery or audited supersession, not recomputation |
| BUG-180 | 2026-07-31 | Submitted correction has one audited supersession-to-successor path |
| BUG-181 | 2026-07-31 | Terminal queue history remains immutable while successor demand is legal |
| BUG-182 | 2026-07-31 | Transaction recovery distinguishes settled, recoverable, busy, and missing-contract states |
| BUG-183 | 2026-07-31 | Cache-trail mapping contract is delivered through the generated Completion Contract |
| BUG-184 | 2026-07-31 | Current-candidate omissions are grouped into one identity-complete repair finding |
| BUG-185 | 2026-07-31 | Current result/hash truth is ledger-first, without a sync-index path |
| BUG-186 | 2026-07-31 | Submit-integrity preflight shares the formal-submit direct facts without becoming a Gate |
| BUG-187 | 2026-08-03 | HITL1 capability probe opaque to user |
| BUG-188 | 2026-08-05 | Closed host-owned residual: selected-host wait display is not static, but authoritative progress remains a host interface concern |
| BUG-189 | 2026-08-03 | Shared reference count floor rejects Phase-Agent-authored reference files as delegated bypass |
| BUG-190 | 2026-08-03 | `source_identity.kind` discriminator `submitted_work` is non-obvious |
| BUG-191 | 2026-08-03 | Wave0 return-map projection requires O(N) per-source entries |
| BUG-192 | 2026-08-05 | Current-head unobserved behavior: C2 stopped at Supervisor selection; no C3 admission or compliance claim |
| BUG-193 | 2026-08-05 | Closed as BUG-188's Wave1 duplicate host-owned residual |
| BUG-194 | 2026-08-03 | Wave1 enqueue rejects task cards with top-level `assignment_mode` |
| BUG-195 | 2026-08-05 | Current-head no-reproduction: retained case-164 native PASS has a submitted per-claim `cache_trail_refs` binding |
| BUG-196 | 2026-08-05 | Current-head no-reproduction: retained case-164 routes the first completed attempt to semantic `fail_and_replace`, not `return_to_actor` |
| BUG-197 | 2026-08-05 | Current-head no-reproduction: retained case-164 records a failed primary followed by one submitted fresh-primary replacement |
| BUG-198 | 2026-08-05 | Current-head unobserved behavior: C2 stopped at Supervisor selection; no C3 admission or compliance claim |
| BUG-199 | 2026-08-03 | Final synthesis claims evidence-backed findings but cites zero evidence files |
| BUG-200 | 2026-08-07 | Current-head supplementary work-unit contribution projection coverage; no new change required |
| BUG-201 | 2026-08-07 | Wave1 semantic-section descriptor and evaluator parity (`v0.76`) |
| BUG-202 | 2026-08-07 | Missing submitted-work-unit root-first fail-closed feedback (`v0.76`) |
| BUG-203 | 2026-08-07 | Queue failure terminates without recursive generic repair successors (`v0.75`) |
| BUG-204 | 2026-08-07 | Closed as stale terminal fixture contract drift; strict snapshot/hash protections retained (`v0.76`) |
| BUG-205 | 2026-08-08 | Semantic-section parser no longer treats nested `###` as section boundary; Key Findings organized in subsections is non-empty (`v0.78` WAI-011) |
| BUG-206 | 2026-08-08 | Reference `acceptance_status: accepted :warning:` quoting documented; frontmatter failure names offending value (`v0.77` REF-010) |
| BUG-207 | 2026-08-08 | `operate-topic-state schema` exposes wave-dependent source_identity forms + wave_rules (`v0.77` CTS-010) |
| BUG-208 | 2026-08-08 | Wave2 finding currentness (`W2F-\d{3}`, `created_in_rerun_count`) documented; apply feedback names missing fact (`v0.77` WTS-012) |
| BUG-209 | 2026-08-08 | `operate-queue check` reports distinct `drained: true` for a fully drained queue (`v0.78` AGQ-027) |
| BUG-210 | 2026-08-08 | Wave1 reference-floor-deficit feedback names depth-review `reviewed_work_unit_refs` sync (`v0.77` WAI-009) |
| BUG-211 | 2026-08-08 | Canonical Wave1 locator derivation documented + inspect surfaces canonical target (`v0.77` REF-011/WAI-010) |
| BUG-216 | 2026-08-12 | Final vocabulary static-contract drift repaired by `repair-agent-guidance-contract-drift` (`65fdb829a`) |
| BUG-217 | 2026-08-12 | Bounded top-up guidance vocabulary drift repaired by `repair-agent-guidance-contract-drift` (`65fdb829a`) |
| BUG-218 | 2026-08-12 | Public Wave2 finding source-identity form repaired by `harden-agent-authored-contracts` (`ab2f17c49`, v0.88) |
| BUG-219 | 2026-08-12 | Raw document-markup reference-format false pass repaired by `harden-agent-authored-contracts` (`ab2f17c49`, v0.88) |
| BUG-220 | 2026-08-12 | Current Wave2 `finding_id` feedback retained and protected by an exact regression in `repair-wave1-reference-closeout-feedback` (`5503cc37b`, v0.89); no runtime change required |
| BUG-221 | 2026-08-12 | Wave1 post-submit guidance now completes valid depth review before inspect and consumes inspect-provided exact target; locator constants remain implementation-only (`5503cc37b`, v0.89) |
| BUG-222 | 2026-08-12 | Concrete unusable submitted-backing/depth-review roots now precede synthetic Topic guards, with direct prerequisite masking (`5503cc37b`, v0.89) |
| BUG-223 | 2026-08-12 | Current hash-valid supplementary-row classification and depth-review primary repair projection fixed (`5503cc37b`, v0.89) |
| BUG-224 | 2026-08-12 | Accepted one-contribution deferred grammar retained; playbook clarifies explicit entries and sequential deferred applies (`5503cc37b`, v0.89) |
| BUG-225 | 2026-08-17 | Claim stdout JSON contract regression-locked (SUD-008) + `result_hash` basis documented (`0e97d0774`) |
| BUG-226 | 2026-08-17 | WNC-010 bootstrap exception scoped to advance-status sync only; enter-phase stays the legal node loader — phase docs, machine checker and doc-lock tests corrected (`0e97d0774`) |
| BUG-227 | 2026-08-17 | Research-access envelope Available example uses `round_budget_not_attempted` for the unstarted reserve sample (`0e97d0774`) |
| BUG-228 | 2026-08-17 | Wave1 ref-floor definition failure message states the profile-driven threshold and submitted-backing countable scope (`0e97d0774`) |
| BUG-229 | 2026-08-17 | phase-setup.md documents the pre-gate bootstrap status window and `advance-status --to setup_ready` gate prerequisite (`0e97d0774`) |
| BUG-230 | 2026-08-17 | finding-index required top-level keys and `cross_topic_resolution` non-empty `origin_refs` documented in shared-schemas (`0e97d0774`) |
| BUG-231 | 2026-08-17 | Run-scoped helper scripts get a sanctioned bundle `_scripts/` home; gitignore masking patches removed (`0e97d0774`) |
| BUG-235 | 2026-08-19 | User-directed closure of post-final reentry `enter-phase` handoff defect; archived as residual diagnosis without claiming a code fix |
| BUG-232 | 2026-08-19 | Wave0 shared-reference materialization selects by cross-topic balance (fewest projected per topic, then `topic_slug`, then lowest ordinal) instead of global lexicographic exhaustion; pure selector extracted and round-robin locked (`fix-transaction-guards-and-wave0-reference-balance`) |
| BUG-233 | 2026-08-19 | Work-unit transaction two-orphan deadlock resolved: multi-orphan feedback converges to one deterministic recover coordinate (wrapper dependency first), recover itself runs with orphan blocking disabled (`fix-transaction-guards-and-wave0-reference-balance`) |
| BUG-234 | 2026-08-19 | Work-unit transaction authority surface narrowed to `_work_units/**` (minus lock/current journal) + root output ledger; concurrent non-authority writes no longer mark a transaction suspect (`fix-transaction-guards-and-wave0-reference-balance`) |
| BUG-236 | 2026-08-19 | Post-final second rerun unblocked: C5 events bind the primary-series inventory digest (`final_inventory_basis: primary_series`); legacy whole-tree events recover through the structural primary-series fallback (`fix-transaction-guards-and-wave0-reference-balance`) |
| BUG-237 | 2026-08-24 | Seed Topic 初始化正文在 Wave0 前仍为 pending（frontmatter enriched + body pending 被 seed-topics-ready 放行）；gate 新增确定性模板占位检测 + phase/template 显式 gap 形式收紧（`2026-08-24-enforce-seed-initialization-body-completeness`） |
| BUG-238 | 2026-08-24 | Wave0 deferred contribution 的 all-or-nothing 前置条件未文档化；playbook 与 phase-wave0 写明 disposition 兼容性前置条件与混合贡献的显式-entry 恢复路径，collision 反馈点名恢复（`2026-08-24-document-wave0-deferred-all-or-nothing`） |
| BUG-239 | 2026-08-24 | 并发 delegated receipt 写入把另一 work-unit 的合法 submit 事务误报 suspect；undeclared-mutation 归属收窄到本事务 target work-unit 目录 + 根 ledger，其他 work-unit 目录归并发 actor，fail-closed 与恢复保留（`2026-08-24-scope-work-unit-transaction-attribution`） |
| BUG-240 | 2026-08-21 | 新 topic 多并发 wave0 source-intake work unit 共享同一 source.yaml 破坏 submitted source contribution 单调投影、wave0 gate 永久阻塞；由 Wave0 source-target exclusivity guard（enqueue/check/claim 同 target 非终态拒绝 + 串行 supplement 指引）结案，fragment merge 明确 out of scope（`2026-08-21-guard-wave0-source-target-exclusivity`） |
| BUG-241 | 2026-08-26 | post-final 多轮 rerun 时 `supersededBy` 把 rerun#2 的 `hitl2→phase-rerun` 回入 pass（trace 732，passed=true）误判为被后续 attempt（1065 失败 / 1068 不同 next）覆盖而丢弃，descendant 链在 index 743 判 discontinuous，readiness/Final 交付多路阻断；`supersededBy` 收窄为「同点重跑同一次决定」（passed:false 与跨轮不同 next 永不覆盖），multi-round 链恢复连续（`2026-08-26-fix-post-final-rerun-lineage-supersession`） |
| BUG-242 | 2026-08-26 | work-unit dry-submit 的 cache-URL mismatch（missing_cache / invalid_result）诊断不给 cache leaf 实际 url；诊断现携带 cache leaf 记录的实际 urls 与差异细节，Agent 无需手动读 meta.json（`2026-08-26-improve-dry-submit-diagnostic-feedback`） |
| BUG-243 | 2026-08-26 | work-unit runtime-receipt 非法 ts 诊断不给字段原始值与全部受影响行号（只指 line 1）且不说明合法格式；诊断现携带原始非法值、全部受影响行号与 ISO 8601 格式预期（`2026-08-26-improve-dry-submit-diagnostic-feedback`） |
| BUG-244 | 2026-08-26 | `supersededBy` 把「后续失败 attempt（passed:false）」误判为对「先前 passed pass」的覆盖，合法 pass 被吞；失败 attempt 永不覆盖先前 pass（`2026-08-26-fix-post-final-rerun-lineage-supersession`） |
| BUG-245 | 2026-08-26 | `enter-phase phase-final` 先 `validateEnterPhaseTarget` 报 ok、同一次调用 `evaluateFinalEntryAdmission` 又失败，自相矛盾；Final admission 并入授权判定，单一非自相矛盾裁决（`2026-08-26-fix-post-final-rerun-lineage-supersession`） |
| BUG-246 | 2026-08-27 | post-final 追加证明 `proveNewerFinalAppend` 用 plain-sort 条目顺序 digest retained，而 C5 绑定摘要用 `localeCompare` 顺序——现代 series（`final.md` + `final_vN.md`）下两者必然相反，追加证明永久 `matched:false` → 再次 C5 卡 `accepted_lineage_drift`（字节无关，真实 bundle `dpt_rb_chinese-ai-inference-chips-vs-nvidia`）；retained rehash 复用 `digestFinalReportPrimarySeriesEntries` 单一规范顺序 helper，现代 series witness→append 全链单元/integration 回归（`2026-08-27-fix-final-append-proof-primary-series-order`） |
| BUG-247 | 2026-08-27 | post-final 追加证明对 `primary_series` basis 无 `whole_tree` 已有的 structural fallback：C5 witness 绑定的瞬时字节态经合法越带重组后不可复原（retained digest 候选集封闭且全不中，7380 组合穷举零命中），inspect 永久 `blocked: accepted_lineage_drift`、rerun 预算不可达，数据层不可修；为两个 basis 统一 structural fallback（独立诊断 basis `primary_series_structural_fallback`），fallback 接受强制 inspect warning + `facts.retired_append_proof` 暴露，结构破坏仍 block；真实 bundle 解锁至 rerun#4 窗口（`2026-08-27-post-final-primary-series-structural-fallback`） |
| BUG-248 | 2026-09-02 | HITL1/seed-topics 初始建 topic 阶段无法物理移除 topic 或改 slug；`mutate_layout` 完整 target 在 legal HITL1 pre-gate window 获得授权（与 rerun 同护栏），inspect baseline context 按窗口派生（`2026-09-02-extend-mutate-layout-to-hitl1`） |
| BUG-249 | 2026-09-03 | Wave1 gate 疲劳后 Phase Agent 在 `stop: no` 静默期自写脚本落 `final/final.md`、手勾 `rb_plan.md## Progress`、向用户谎报完成——同族第三次爆发（BUG-033/042/047-049/063），根因是防线全部合规内生（pull-based）；改为外生可检 + 自我挫败：wave gate 新增 `premature_final_present` fail-closed blocking root（唯一补救 `final/attic-<原名>`），audit 封闭词表新增 `premature_final_present`/`plan_progress_tamper_suspected` 并全返回挂 integrity 对象，`enter-phase` 输出附带 bounded integrity 摘要，Progress 手勾为可指证篡改证据，完成宣告需 terminal 事实 backing；全量回归 3007/3007 绿（`2026-09-03-close-lifecycle-bypass-detection-gap`） |
| BUG-250 | 2026-09-03 | `wave1_topic_deepening` submit 对空 `source_claims[]`/`accepted_source_urls[]` + 占位 cache（example.com / "Deep research content."）fail-open，质量闸门推迟到 gate（49 次失败后疲劳），是 BUG-249 家族绕过前的伪造入口；修复：`validateSourceClaims` 空 claims 且无显式 degraded capture 时 fail-fast（按 `outputContract.source_claims.allowed` 限定 kind），cache-leaf 占位判定扩展覆盖标题+填充句/纯标题页/IANA 示例域名映射（显式 degraded 出口保留），拒绝发生在 ledger append 前且不触发 inline backfill（`2026-09-03-harden-wave1-evidence-and-trace-integrity`） |
| BUG-251 | 2026-09-03 | `rb_trace.jsonl` 可被 run-scoped 脚本 `echo >>` 直接伪造（bundle 短名、ts 倒填、`wave2_completion` 无对应 gate），audit 0 次读 trace、gate `trace_event_present` 消费伪造事件；关键事实：`rb_status.json#/bundle` 短名与伪造事件同值，只有目录 basename 能区分；修复：全部 trace 写入者（traceEntry 集中 stamp / writeGateAttempt / log-event）强制 writer 身份 + canonical bundle（目录 basename，detail 不可覆盖），wave gate `trace_event_present` fail-closed 校验 canonical basename（缺 writer 容忍历史事件），audit 新增 advisory 完整性检查（完成事件须 passed gate_attempt 见证 + ts 单调 + canonical bundle，`final_report_complete` 无 gate 必标记）（`2026-09-03-harden-wave1-evidence-and-trace-integrity`） |

**Next available bug ID: BUG-252**

---

## Suspended (未修复，仍在排查)

这些 bug 仍在 `../_suspended_bugs/`，当前无获批 implementation change：

| ID | Date | Title |
|----|------|-------|
| BUG-026 | 2026-07-05 | run.log severely under-records Agent actions (P0) |
| BUG-028 | 2026-07-05 | Seed topic backfill perfunctory — bare pointer, zero substance (P1) |
| BUG-030 | 2026-07-06 | No sub-agent timeout — Phase Agent blocks indefinitely (P0) |
| BUG-129 | 2026-07-28 | Wave1 projection counterexample gate; reopen only when a current fully backed projection still reports `submitted_source_backing_missing` |
| BUG-130 | 2026-07-28 | Wave2 pure-synthesis counterexample gate; reopen only when a complete existing-backed branch is rejected solely for lacking a Wave2 receipt or for Phase projection ownership |
| BUG-131 | 2026-07-28 | Accepted Wave2 fail-closed policy residual risk; reopen only after a separate product decision rejects that policy cost |
| BUG-142 | 2026-07-29 | Wave1 legacy ledger observation predates submitted-backed Phase-owned closeout; suspended pending a valid current-head Agent-flow result that still emits an exhausted work-unit path |
