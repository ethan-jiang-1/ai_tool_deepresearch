# Playbook Manifest

所有 experiment case 的权威清单。`RUN_TUI_EXPS.md` 和 `RUN_CLI_EXPS.md` 均引用此文件作为"跑哪些"的单一数据源。

新增 case 时 SHALL 同步更新此文件中的对应表格。

## 跑哪些

**默认行为：跑完当前可运行清单。一路到底，中间不停。全部跑完。**

这是 MD，没有 CLI 参数——runner 根据**用户的意图**决定跑哪些：

- 默认（用户没明说 / "跑一下" / "跑测试"）→ **Current Light + Standard + Heavy，**
- "快点 / 跑轻的 / 快速验证" → 只跑 **Light**
- "跑重的" → 只跑 **Heavy**
- "跑标准的" → 只跑 **Standard**
- "跑没过的 / 重跑失败的" → 只重跑上次 **FAIL** 的

**拿不准也跑 current 清单**。全部跑完再出 report，中间不要停下来问。

三档（见下方三张表）：

- **Light**：纯 JS/CLI/gate/filesystem E2E，跑得快，改完代码就该跑。
- **Standard**：真实 bundle 多步骤执行（repair loop、artifact 检查等），无外部调用。
- **Heavy**：包含 real Agent/sub-agent、WebSearch/WebFetch、长链或其他昂贵/慢执行——因此单列。
### Light（纯 JS/CLI/gate/filesystem，改完代码就该跑）

| Group | Case ID | Playbook | 验证什么 |
|-------|---------|----------|---------|
| G1 gate-fork | case-11 | `exp_gate-fork/case-11-light-four-returns.md` | Gate 单次 checkpoint 四种返回 |
| G2 gate-loop | case-21 | `exp_gate-loop/case-21-light-three-returns.md` | Gate 单次 checkpoint 三种返回 |
| G3 workflow-chain | case-31 | `exp_workflow-chain/case-31-light-lazy-load.md` | Lazy loader 不预读 MD |
| G4 agentic-queue | case-41 | `exp_agentic-queue/case-41-light-minimal-path.md` | queue v2 最小路径：enqueue→claim→complete→promotion→projection |
| G10 pre-research | case-106 | `exp_wff_pre-research/case-106-light-plan-body-gate.md` | plan_body gate：plan body 存在性校验 + missing→fail + 合法→pass |
| G10 pre-research | case-181 | `exp_wff_topic-rewrite/case-181-light-hitl1-topic-rewrite-vague.md` | 一句话 → topic rewrite → original topic + seed topics（引用 phase-hitl1.md §3a） |
| G10 pre-research | case-182 | `exp_wff_topic-rewrite/case-182-light-hitl1-topic-rewrite-detailed.md` | 详细 brief → 轻量整理，不越界 rewrite（⚠️ 模拟 Agent 输出） |
| G7 system-logging | case-71 | `exp_system-logging/case-71-light-unified-envelope.md` | 统一 log envelope schema：timestamp/level/event/source/context |
| G7 system-logging | case-73 | `exp_system-logging/case-73-light-startup-log-trail.md` | 启动 log trail：进程启动→config 加载→ready — 至少 3 条 startup 事件 |
| G7 system-logging | case-74 | `exp_system-logging/case-74-light-heartbeat-metadata.md` | logger_ready heartbeat 元数据：node/platform/framework_root，不用 pid |
| G7 system-logging | case-75 | `exp_system-logging/case-75-light-engine-hot-path.md` | queue-manager hot path log events 与 detail.kind 映射 |
| G21 wfn-wave0 | case-213 | `exp_wfn_wave0/case-213-light-happy-and-fail.md` | Light gate-only 版 wave0 happy + fail path |
| G22 wfn-wave1 | case-224 | `exp_wfn_wave1/case-224-light-happy-and-fail.md` | Light gate-only 版 wave1 happy + shallow/cache-thin/depth-review fail path |
| G23 wfn-wave2 | case-235 | `exp_wfn_wave2/case-235-light-happy-and-fail.md` | Light gate-only 版 wave2 pure synthesis + search-required + targeted receipt path |
| G20 wfn-seedtopic | case-202 | `exp_wfn_seedtopic/case-202-light-setup-to-seedtopics-transition.md` | setup→seed-topics transition 最小路径 |
| G20 wfn-seedtopic | case-203 | `exp_wfn_seedtopic/case-203-light-nn-prefix-naming.md` | NN_ 前缀命名约定：registry 1-based 位置推导、gate 三重一致、ls 自然排序、reference {slug}-<qualifier>.md 模式 |
| G24 wfn-rerun | case-301 | `exp_wfn_rerun/case-301-light-chain-dual-exit.md` | 轻量 chain truth：passed→readiness、rerun→phase-rerun、failed→no_transition；不 overclaim gate proof |
| G24 wfn-rerun | case-302 | `exp_wfn_rerun/case-302-light-rerun-node-happy-path.md` | real HITL2 rerun output→witnessed phase-rerun→real rerun-ready→witnessed seed-topics |
| G24 wfn-rerun | case-303 | `exp_wfn_rerun/case-303-light-normal-path-unchanged.md` | real proceed_to_readiness output 与 witnessed readiness status window 保持不变 |
| G24 wfn-rerun | case-304 | `exp_wfn_rerun/case-304-light-gate-fail-max-count.md` | legal rerun entry 后 production-parsed active exclusive limit 由 real rerun-ready gate fail closed |
| G24 wfn-rerun | case-305 | `exp_wfn_rerun/case-305-light-indeterminate-no-transition.md` | 边界：indeterminate outcomes→invalid_input |
| G25 engine-boundary | case-401 | `exp_engine-boundary/case-401-light-full-boundary.md` | Agent/Engine 正向边界：queue demand → work-unit claim → fixture output/receipt/cache → submit → ledger → gate → trace |
| G25 engine-boundary | case-402 | `exp_engine-boundary/case-402-light-complete-reject.md` | work-unit submit rejection matrix：missing receipt/output/cache、nonce mismatch、wrong work_id，均无 ledger append |
| G25 engine-boundary | case-403 | `exp_engine-boundary/case-403-light-work-unit-authority.md` | work-unit authority：missing submitted ledger fails；clean submitted coverage passes；root URL remains valid when parseable；cache drift fails via cache_coverage |
| G25 engine-boundary | case-405 | `exp_engine-boundary/case-405-light-trace-single-sink.md` | trace 单 sink：只存在 bundle 根 rb_trace.jsonl |
| G27 evidence-extraction | case-161 | `exp_evidence-extraction/case-161-light-complete-cache-trails.md` | work-unit submit cache_trails：valid→submitted ledger、incomplete→warning+filter、unsafe→non-terminal rejection |
| G26 file-observability | case-310 | `exp_file-observability/case-310-light-orphan-reference.md` | work-unit submitted reference vs filesystem-only orphan reference |
| G26 file-observability | case-311 | `exp_file-observability/case-311-light-file-explanation.md` | explained non-authoritative file diagnostics stay non-authoritative |
| G26 file-observability | case-312 | `exp_file-observability/case-312-light-wave2-action-add.md` | Wave2 action:add gate rejects delta-only and requires full pair-scan coverage |
| G30 reentry-debuggability | case-307 | `exp_reentry-debuggability/case-307-light-clean-reentry.md` | clean reentry：所有 audit 通过，无 blocker |
| G30 reentry-debuggability | case-308 | `exp_reentry-debuggability/case-308-light-stale-queue-blocker.md` | stale queue blocker 检测：prior-phase active work 阻塞 reentry |
| G30 reentry-debuggability | case-309 | `exp_reentry-debuggability/case-309-light-drift-detection.md` | checkpoint drift 检测：control file hash 变化 → blocker |
| G30 reentry-debuggability | case-313 | `exp_reentry-debuggability/case-313-light-canonical-recovery-incident.md` | registry-external durable topic + parallel namespace → one canonical root + missing contract；不证明 post-final reentry |
| G30 reentry-debuggability | case-314 | `exp_reentry-debuggability/case-314-light-artifact-persistence-crash-recovery.md` | crash-safe content persistence：prepared finalize、post-rename cleanup、blocked no-mutation、Agent cleanup/retry、repeat idempotence |
| G30 reentry-debuggability | case-315 | `exp_reentry-debuggability/case-315-light-canonical-topic-state-recovery.md` | canonical topic add：plan-first crash→exact recover、workspace期间enqueue no-write、恢复后UID-bound topic可入队 |
| G30 reentry-debuggability | case-316 | `exp_reentry-debuggability/case-316-light-canonical-topic-layout-recovery.md` | canonical layout：stable-UID rename/renumber、historical Wave0/Wave1 coverage、mid-seed recover、safe remove、ambiguous no-write |

### G14 Migration Map

G14 `case-140` 至 `case-142` 已从 current runnable surface 删除，不保留 tombstone playbook：

- `case-140` decision capture / branch split → G13 `case-132` + `case-133`。
- `case-141` rerun full path → G13 `case-133` + G24 rerun mechanism cases。
- `case-142` readiness full path → G13 `case-131`。

历史 case ID 仍可通过 git history 与 archived OpenSpec references 追溯。

### Standard（真实 bundle 多步骤，无外部调用）

| Group | Case ID | Playbook | 验证什么 |
|-------|---------|----------|---------|
| G1 gate-fork | case-12 | `exp_gate-fork/case-12-standard-repair-retry.md` | Fork 多路分发 + Converge 修复 |
| G1 gate-fork | case-13 | `exp_gate-fork/case-13-standard-full-pipeline.md` | 完整 pipeline + C&I 反馈 |
| G2 gate-loop | case-22 | `exp_gate-loop/case-22-standard-repair-loop.md` | MD PDCA 修复回路 |
| G2 gate-loop | case-23 | `exp_gate-loop/case-23-standard-full-pipeline.md` | 完整端到端 |
| G3 workflow-chain | case-32 | `exp_workflow-chain/case-32-standard-dep-cache.md` | 依赖去重 + cache hit |
| G3 workflow-chain | case-33 | `exp_workflow-chain/case-33-standard-error-paths.md` | 错误路径 + 恢复 |
| G4 agentic-queue | case-42 | `exp_agentic-queue/case-42-standard-urgent-preemption.md` | queue v2 urgent preemption：ordered active_window、refill_pool、tail restore |
| G4 agentic-queue | case-43 | `exp_agentic-queue/case-43-standard-failure-repair.md` | queue v2 failure repair、unsafe-current guard、empty queue blocker |
| G7 system-logging | case-78 | `exp_system-logging/case-78-standard-fatigue-detection.md` | gate fatigue signal emission and parsing boundaries |
| G5 wff-validation | case-51 | `exp_wff_validation/case-51-standard-happy-path.md` | canonical late-lifecycle proof：real proceed/rerun/context outputs、route-bound entry、source-gate status、Final terminal/no-transition boundary |
| G5 wff-validation | case-52 | `exp_wff_validation/case-52-standard-fail-repair.md` | real fail→repair→same-gate rerun；unwitnessed source-status sync fail closed，补 `enter-phase` 后恢复 |
| G5 wff-validation | case-53 | `exp_wff_validation/case-53-standard-routing-contract.md` | current-node 绑定 + next / terminal / no_transition / config_error routing contract |
| G20 wfn-seedtopic | case-201 | `exp_wfn_seedtopic/case-201-standard-seedtopics-queue-loop.md` | seed topics queue-driven 物化：enqueue→claim→Phase Agent 执行→complete→gate pass |
| G10 pre-research | case-101 | `exp_wff_pre-research/case-101-standard-pre-research-happy.md` | fixed HITL payload → instantiation/hitl1/setup 三个 gate pass |
| G10 pre-research | case-102 | `exp_wff_pre-research/case-102-standard-instantiation-production.md` | production 路径 `instantiate-run-bundle.mjs` → gate pass |
| G10 pre-research | case-103 | `exp_wff_pre-research/case-103-standard-hitl1-quick-factual.md` | research_profile: quick_factual — gate pass |
| G10 pre-research | case-104 | `exp_wff_pre-research/case-104-standard-hitl1-exploratory-map.md` | research_profile: exploratory_map — gate pass |
| G10 pre-research | case-105 | `exp_wff_pre-research/case-105-standard-hitl1-claim-verification.md` | research_profile: claim_verification — gate pass |
| G11 pre-research-repair | case-111 | `exp_wff_pre-research-repair/case-111-standard-repair-loop.md` | gate fail → inspect/advice → repair → rerun → pass |
| G11 pre-research-repair | case-112 | `exp_wff_pre-research-repair/case-112-standard-fault-tolerance.md` | bad JSON / multi-rule fail / missing bundle — gate 不崩溃 |
| G11 pre-research-repair | case-113 | `exp_wff_pre-research-repair/case-113-standard-review-surface.md` | HITL 问题面 + AI interpretation sample + human review checklist |
| G12 wave-gates | case-123 | `exp_wff_wave-gates/case-123-standard-wave2-synthesis.md` | wave2-complete gate：Markdown link 解析 + dead target + cross-artifact reference（RWE-009） |
| G12 wave-gates | case-124 | `exp_wff_wave-gates/case-124-standard-seed-topics-boundary.md` | seed-topics-ready gate：空目录/缺失 slug/多余 slug + slug_consistency 双向校验 |
| G15 wave-chain | case-151 | `exp_wff_wave-chain/case-151-standard-waves-full-chain.md` | seed-topics→wave0→wave1 depth-review→wave2 scan/eligibility 全链路 4 gate 顺序 pass |
| G15 wave-chain | case-152 | `exp_wff_wave-chain/case-152-standard-wave-repair-loop.md` | wave2 gate fail→repair→pass PDCA 回路 |
| G15 wave-chain | case-153 | `exp_wff_wave-chain/case-153-standard-wave-fault-tolerance.md` | malformed YAML / partial dead links / status drift — gate 容错 |
| G13 delivery | case-131 | `exp_wff_delivery/case-131-standard-delivery-full-chain.md` | real HITL2→readiness→Final，两个 witnessed handoff + source-gate status + Final terminal semantics |
| G13 delivery | case-132 | `exp_wff_delivery/case-132-standard-hitl2-decision.md` | real HITL2 gate：missing/empty/sentinel/invalid fail；无 phase diagnostic event 的 valid decision pass |
| G13 delivery | case-133 | `exp_wff_delivery/case-133-standard-hitl2-rerun.md` | real `rerun -> phase-rerun` handoff，再经 real rerun-ready 到 seed-topics |
| G13 delivery | case-134 | `exp_wff_delivery/case-134-standard-delivery-repair.md` | HITL2/readiness 两个 same-check repair loop，保留真实 fail/pass gate attempts |
| G13 delivery | case-135 | `exp_wff_delivery/case-135-standard-readiness-precheck.md` | readiness direct prerequisites：artifact/prior gate/YAML/JSONL negative probes + complete pass |
| G24 wfn-rerun | case-306 | `exp_wfn_rerun/case-306-standard-two-round-delta.md` | scripted Agent/filesystem projection only：rerun_count 与 direction sections；不证明 gate、handoff或 real Agent judgment |
| G25 engine-boundary | case-404 | `exp_engine-boundary/case-404-standard-queue-boundary.md` | Queue 边界合约：non-delegated 不受影响；delegated 强制 provenance；controller:"sub-agent" 被拒 |
| G27 evidence-extraction | case-162 | `exp_evidence-extraction/case-162-standard-gate-reentry-cache-coverage.md` | gate count_floor（scoped）+ cache_coverage（verified+mapped/missing/empty）+ file observability cache_gap + check-reentry 集成 |
| G60 autonomous-research-hardening | case-601 | `exp_autonomous-research-hardening/case-601-standard-wave0-fail-stays-in-phase.md` | BUG-033：Wave0 gate fail 后保持 phase-bound repair，premature final 只作为诊断 |
| G60 autonomous-research-hardening | case-602 | `exp_autonomous-research-hardening/case-602-standard-status-drift-return-to-legal-phase.md` | BUG-042：status drift audit 检测手改/跳 phase，并指回 latest legal target |
| G60 autonomous-research-hardening | case-603 | `exp_autonomous-research-hardening/case-603-standard-surfacing-intent-abort.md` | BUG-043：stop:no would-have-surfaced 记录 `surfacing_intent` 并保持 diagnostic-only |

### Heavy（真实 Agent/sub-agent、外部调用、长链或其他慢执行，自动化可跑）

| Group | Case ID | Playbook | 验证什么 |
|-------|---------|----------|---------|
| G21 wfn-wave0 | case-211 | `exp_wfn_wave0/case-211-heavy-wave0-happy-path.md` | seed_topics→wave0 queue-loop→sub-agent 真实搜索→backfill→gate pass 全链路 |
| G21 wfn-wave0 | case-212 | `exp_wfn_wave0/case-212-heavy-gate-fail-repair.md` | gate fail（count_floor 检测缺失 source.yaml）→repair→gate pass，trace 含 fail+pass 两条 gate_attempt |
| G22 wfn-wave1 | case-221 | `exp_wfn_wave1/case-221-heavy-batch-subagent.md` | 2-topic wave1 deepening canary：queue demand → work-unit claim --count → real sub-agent submit → backfill → gate pass；无 real result 时 NOT RUN |
| G22 wfn-wave1 | case-222 | `exp_wfn_wave1/case-222-heavy-gate-fail-repair.md` | gate fail（缺失 evidence-summary）→repair→gate pass，trace 含 2 条 gate_attempt |
| G22 wfn-wave1 | case-223 | `exp_wfn_wave1/case-223-heavy-subagent-failure.md` | WebFetch blocked→完整抓取链（curl→node→python3）→partial evidence 不编造→gate 仍 pass |
| G23 wfn-wave2 | case-231 | `exp_wfn_wave2/case-231-heavy-synthesis-happy-path.md` | post-wave1→wave2 queue-driven synthesis→三件套 artifact→backfill→gate pass 全链路 |
| G23 wfn-wave2 | case-232 | `exp_wfn_wave2/case-232-heavy-finding-triage.md` | finding taxonomy 三类区分（legacy/resolution/emergent）+ 六 decision + resolution 不 spawn sub-agent + search 有 receipt + 无 orphan |
| G23 wfn-wave2 | case-233 | `exp_wfn_wave2/case-233-heavy-gate-fail-repair.md` | gate fail（ledger 缺 section + backfill token 残留）→inspect/advice→repair→gate pass，trace 含 fail+pass 两条 gate_attempt |
| G23 wfn-wave2 | case-234 | `exp_wfn_wave2/case-234-heavy-subagent-search.md` | emergent question→explore_search→spawn dpt-topic-scout 真实搜索→ingest receipt→index 更新→re-synthesize→00_shared promote→gate pass |
| G11 pre-research-repair | case-114 | `exp_wff_pre-research-repair/case-114-heavy-hitl1-manual-review.md` | HITL1 payload 枚举（auto mode 6 vectors） |
| G11 pre-research-repair | case-115 | `exp_wff_pre-research-repair/case-115-heavy-hitl1-research-access-probe.md` | HITL1 real search/fetch capability probe：available→gate pass；honest unavailable→fail closed/no Setup；无 evidence leakage |
| G15 ai-judge | case-951 | `exp_workflow-foundation/case-951-heavy-topic-rewrite-ai-judge.md` | AI 扮演真人 dual of 901：真 Agent rewrite + AI reviewer verdict（source: ai-judge，非真人）；9NN +50 对偶 |
| G25 engine-boundary | case-406 | `exp_engine-boundary/case-406-heavy-real-subagent-boundary.md` | 真实 Sub-agent/WebSearch/WebFetch canary：work-unit task/beacon/receipt/result → submit → ledger/provenance/cache gate authority；无 real result 时 NOT RUN |
| G25 engine-boundary | case-407 | `exp_engine-boundary/case-407-light-actor-preflight-fallback.md` | role-bound unavailable no-claim 零 authority mutation；显式单项 Phase Agent fallback submit/ledger provenance；later normal batch |
| G27 evidence-extraction | case-163 | `exp_evidence-extraction/case-163-heavy-rerun-add-real-cache-trail.md` | 真实 Agent/Sub-agent continuation canary：historical normal prerequisite → real rerun add 2 Topics → normal Wave0/Wave1 + supplement → hint-only same-Gate repair → declaration fault/hash-identical recovery；无 Agent/search/fetch 时 NOT RUN |
| G24 wfn-rerun | case-318 | `exp_wfn_rerun/case-318-heavy-rerun-direction-recovery.md` | real subject Agent 写 current direction，恢复 direction/profile crash window，并通过 real rerun gate/handoff；setup-only、无 external calls，不证明 downstream research |
| G71 iterative-interaction | case-711 | `exp_iterative_interaction/case-711-heavy-hitl1-natural-acceptance.md` | real subject HITL1 recommendation + exact “按这个开始” + subject-owned profile/topic/probe/Gate；available 与 honest unavailable 双分支，无 independent subject 时 NOT RUN |
| G71 iterative-interaction | case-712 | `exp_iterative_interaction/case-712-heavy-hitl2-natural-rerun.md` | real subject HITL2 review/one recommendation + exact资本约束自然语言 rerun + real Gate/handoff；无第二用户回复，无 independent subject 时 NOT RUN |
| G71 iterative-interaction | case-713 | `exp_iterative_interaction/case-713-heavy-user-initiated-turn.md` | readiness 与 pre-artifact Final 两个 independent subject reply；A=B、精确 B→C allowlist、C=D、Final empty、root-traced transcripts；缺任一 subject 时 NOT RUN |
| G60 autonomous-research-hardening | case-604 | `exp_autonomous-research-hardening/case-604-heavy-real-subagent-write-before-return.md` | BUG-039/040：真实 Sub-agent 写 result/receipt/output/cache 后才返回，nonce/identity 保持，submit 成功；无 native Sub-agent 时 NOT RUN |
| G60 autonomous-research-hardening | case-605 | `exp_autonomous-research-hardening/case-605-heavy-bundle-containment-real-subagent.md` | BUG-037：真实 Sub-agent 写入全部留在 active bundle root，repo-root leak inspection clean；无 native Sub-agent 时 NOT RUN |
