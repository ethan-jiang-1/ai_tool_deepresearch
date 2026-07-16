## Context

本 change 来自两个历史事故计划，但以当前 v0.30 accepted specs 与 executable contracts 为基线。当前框架已经具备 shared structured findings、side-effect-free Wave inspect、formal Gate projection、dry-submit、root-first repair hints、retry/late-submit lineage、Phase-owned reference projection 与 reentry audit。旧计划中的 completion manifest、generic consistency CLI、repair journal、trace decision layer 与 legacy/delta Gate path都不是当前缺口。

当前仍有三个 decision-boundary gaps：

1. Wave2 general finding-index check 只用 `pair_count_checked > 0` 证明 scan 未被跳过，rerun `action:add` 又以 ledger/index 中出现 topic slug 代理 full pair coverage。两者既不能证明 pair facts，也维护了两条近似 truth path。
2. Wave phase Markdown 明确要求 queue demand 与 delegated in-flight drain 后才 Gate，但 Wave0/Wave1/Wave2 shared evaluator 没有把 schema-valid queue quiescence 作为 pass prerequisite。
3. Runtime receipt `detail` 不参与 identity/progress/coverage verdict，却只接受 object；与此同时 role guidance 把 `log-event.mjs` 写成 lifecycle emitter，而 generated task 要求直接 append assigned receipt，制造了可避免的 submit guessing。

初版设计曾把 `action:add` 的 full-pair policy 泛化为所有 Wave2 run。复核 accepted behavior 后否决该方向：`wave2-synthesis` 明确允许 profile-authorized reduced coverage；`research-styles` 的 `wave2_cross_topic_depth` 为 0/1/2 且当前是 Agent quality self-check；`action:supplement` 明确保留 delta/append；只有 `action:add` 明确要求重建全部 topic pairs。

本设计共同应用 `guidelines/evolution-simple-reliable-control.md` 与 `guidelines/evolution-helper-oriented-agent.md`：同一 deterministic fact 只有一个 evaluator，前置失败短路，普通修复由 Agent 执行，用户只接收新的语义/风险/权限/外部决定。

## Goals / Non-Goals

**Goals:**

- 用一个 normalized pair-fact evaluator 取代 nonzero count 与 slug/text presence 弱代理，但保持 ordinary reduced-coverage 与 `action:add` full-pair 两种 accepted policy。
- 让 Wave0/Wave1/Wave2 inspect 与 formal Gate 从同一个 pure queue rule确认整个 queue 已 quiesce。
- 保持 receipt binding 严格，同时容忍 diagnostic message string 与 keyed context object。
- 消除 assigned runtime receipt 与 optional diagnostic log 的 guidance 歧义。
- 所有新 failure 返回最小 direct root、现有合法 owner/action 与 same-check rerun，不把普通机械执行推给用户。

**Non-Goals:**

- 不把 `wave2_cross_topic_depth` 的 Agent quality self-check改造成新的 deterministic quality Gate；若未来需要，必须先提供可机器验证的 checked-dimension contract。
- 不新增 phase completion manifest、repair journal、pair ledger、queue summary 或任何 persistent state。
- 不新增 generic consistency CLI、repair controller、watcher、daemon、automatic retry/repair/degrade tree。
- 不让 trace、checkpoint、diagnostic、log、ledger prose 或 Markdown projection成为 pair/queue/receipt 的第二 Gate authority。
- 不改变 work-unit identity、ledger、hash、late-submit、retry、reference ownership、delta/rerun lifecycle 或 permission model。
- 不为旧 bundle 建 legacy compatibility tree；需要时由 Agent修复 direct facts 后重跑同一 checkpoint。
- 不在 receipt/log wording修改中顺带重写 Sub-agent search/fetch fallback。Active role docs仍出现与 repo no-Python hard rule不一致的 Python fallback wording；这是独立 existing debt，apply不得复制/扩张该 wording，但本 change不改变 fetch capability或 routing contract。

## Decisions

### 1. 一个 pair-fact evaluator，两个 accepted policy consumers

Engine 从 canonical `rb_plan.md#/topic_registry` 派生 topic identity map 与全部 unique unordered pair universe。对于 UID-bound registry，声明 identity通过现有 topic-layout facts从 UID、current slug或 previous slug归一到 UID；仍受支持的 legacy registry使用内部 canonical key `legacy:<id>:<current-slug>`，并从 current/previous layout token归一到该 key。诊断始终显示 current slug。该 fallback只存在于 pure evaluator内存结果，不新增 persistent identity或 legacy success path。

`artifacts/wave2/finding-index.yaml#/synthesis_eligibility/scan_topic_pair_coverage` 是 deterministic Gate-readable pair projection；`cross-topic-ledger.md` 仍是 Agent-readable process evidence，但 Gate 不从自由 Markdown 或 slug mentions推断 pair identity。这个选择明确收敛 accepted `ledger OR index` 弱 bypass：pair reasoning 可在 ledger 中展开，blocking pair facts 必须投影到现有 structured index。

把 `wave2-synthesis` 已接受但未完整定义的 object/array container收窄为一个 grammar：

- array form：每项为 `{ pair: [topicA, topicB], refs?: [...] }`；
- object form：只接受 `{ pairs: [<same entries>] }` wrapper；
- 不接受 single-entry object、arbitrary object map、object key、free text或 slug substring隐式编码 pair的第二 grammar。

当前 executable fixtures使用 array；没有发现 active object producer需要迁移。Object wrapper是在本 change中把既有开放类型补成可测试 contract，不为未观察到的猜测形状建立 compatibility tree。

Normalizer 先验证 parent/container/entry shape，再解析 pair identity。Malformed、self、unknown 与 duplicate unordered pair 都是 direct structure/binding failures。Parent 或 identity root存在时，dependent count/policy comparisons被 mask。Pair parent/identity/count coherence与 activated `action:add` full-universe requirement都不是 soft quality floor，不得通过 fatigue degradation越过。

普通 first-run 与 `action:supplement` 的完成自洽规则是：

- `scan.topic_count` 等于 canonical topic count；
- `pair_count_expected` 等于 canonical `C(n,2)` universe；
- `pair_count_checked` 等于 observed unique normalized pair count；
- `pair_count_checked` 是 `0..pair_count_expected` 内整数，普通 reduced coverage允许小于 expected universe；
- canonical topic count大于 1 时 observed structured pair set至少包含一个 pair，证明 scan没有被完全跳过；profile depth 0表示不要求 material connection，不把 empty structured scan变成 pass；
- 不要求 observed set 等于 full universe，也不把 profile depth 0/1/2 偷换成 universal `C(n,2)` policy。

由现有 shared direction resolver 激活的 `action:add` 在同一个 evaluator result 上增加唯一的 stricter policy：observed set必须等于 full canonical universe，`pair_count_expected` 与 `pair_count_checked` 都必须等于 `C(n,2)`。这同时证明 existing × existing 与 added × pre-existing；本 change不重定义 matching/future/legacy crash-recovery semantics。Rerun-specific code只保留 `Delta Synthesis` 禁止规则和 resolver-owned action detection，不再解析 slug/pair coverage。若 general finding-index/pair normalization失败，rerun full-universe implication SHALL be masked；不得把同一个 malformed/missing pair通过两个 Gate rules报成两个 repair roots。

**Alternatives considered:**

- 所有 run 都 exact full set：拒绝；与 reduced profile 和 supplement delta semantics冲突，并把一次 rerun incident升级成全局 cost policy。
- 只比较 `pair_count_checked == C(n,2)`：拒绝；duplicate/self/unknown pair可伪造 count。
- 同时解析 ledger Markdown 与 finding-index：拒绝；同一 fact 形成两个 blocking parsers，且 presentation drift会误阻塞。
- 新建 pair manifest/coverage ledger：拒绝；topic、pair 与 counts 可从现有 authority重建。

### 2. Wave Gate 要求 global queue quiescence

新增一个 pure evaluator，直接检查 `rb_queue.json` 存在、读取 JSON并通过现有 `QueueSchema` 解析，pass条件只有：

```text
active_window.length == 0
refill_pool.length == 0
Object.keys(delegated_in_flight).length == 0
```

Checker SHALL NOT调用 missing-file时会构造空 queue的 `loadQueue()`，也不写 canonical/defaulted queue bytes；QueueSchema defaults只用于现有 parse compatibility。Missing file必须保持 authority prerequisite failure。

这是 handoff quiescence，而不是 `operate-work-unit claim` 返回的 delegated-only `phase_drained` projection。当前 accepted workflow只在进入某个 phase 后灌入该 phase demand，并在 Gate pass/`check.next` 后才加载下一 phase；没有 accepted path在当前 Wave Gate 前预装 future-phase demand。因此任何残留都代表 handoff 尚未完成。若未来要允许跨 phase pre-enqueue，必须先定义 direct phase identity 与 handoff semantics；本 change 不从 queue ID、producer prose、kind prefix、path 或 phase order猜归属。

该 rule 接入 Wave0/Wave1/Wave2 definitions 和现有 shared evaluator，使 side-effect-free inspect 与 formal Gate共享同一 fact finding。Rule 与其 checker-owned finding均使用 `blocking_basis: authority_integrity`，不得加入任何 Wave degradation-eligible allowlist。Queue missing/unreadable/schema-invalid时只返回一个 authority prerequisite root，并 mask container symptoms。

Schema-valid non-empty queue一次只给最近 root：

1. 若 `delegated_in_flight` 非空，优先返回 bounded work IDs/queue IDs，最近动作是现有 `operate-work-unit inspect`，Agent按该 checkpoint的 submit/repair/wait/timeout-preflight/terminal advice执行；
2. 否则若 `active_window` 非空，从 front item的 direct `targets.delegates`选择现有 owner：delegated demand返回当前 Wave的 `operate-work-unit claim` checkpoint，non-delegated demand返回 `operate-queue claim`；不从 item id/kind/path推断 phase；
3. 若只有 `refill_pool` 非空，返回 `repair_kind: missing_contract`。当前公开 queue path不会在 active空时留下 pool-only state，也没有 sanctioned refill-only CLI；不得声称 `operate-queue check`能修复，更不得指导手改 queue；
4. 排空后重跑原 Wave inspect/formal Gate。

Rule 不自动 claim/complete/fail/timeout，不选择 semantic terminal reason，不把普通命令交给用户。Inspect 与 formal Gate保持相同 `rule_id`、root、`missing_fact`、`write_to`；`rerun` 只因实际 checkpoint不同。

**Alternatives considered:**

- 复用 `check-reentry` phase inference：拒绝；completion只需要 direct quiescence，引入历史 phase/path heuristics会扩大误判面。
- 只检查 `delegated_in_flight` 或 delegated-only phase count：拒绝；non-delegated active/refill demand同样表示 phase工作未完成。
- 为 pool-only drift新增 `operate-queue refill`：拒绝；当前 normal lifecycle不产生该状态，不能为未观察到的 authority drift扩大 mutation surface；先诚实暴露 missing contract。
- 新建 queue completion state：拒绝；空集事实可从 queue authority直接重建。

### 3. Receipt authority strict，diagnostic detail narrow-tolerant

`WorkUnitRuntimeReceiptEventSchema` 继续严格验证 `schema_version`、event、work/queue/kind/nonce、actor class/version、JSONL 与 lifecycle presence。可选 `detail` 的语义明确为两种常见诊断表示：human-readable string 或 keyed JSON object。Array/number/boolean/null不符合 message/context语义，仍由 schema拒绝。

Submit、dry-submit、inspect 与 timeout-preflight继续只从 top-level identity/event/timestamp等已接受字段判断 binding/progress/coverage，不从 `detail` 内容或 shape推导 authority。Object/string均原值保留；不生成 normalization event，也不把 string改写为 `{message}`。

Generated `task.md`、spawn prompt、shared Sub-agent protocol与所有 active work-unit role specs统一为：

- lifecycle evidence直接 append assigned `runtime-receipt.jsonl`；
- `log-event.mjs` 可选镜像 diagnostics 到 run log/trace，但不能替代 receipt；
- Phase Agent读取 dry-submit violations，修复同一个 candidate/receipt并重跑，不要求用户执行 pipeline。

**Alternatives considered:**

- 继续 object-only只修文档：拒绝；field不拥有 verdict语义，常见 message representation不应阻塞 submit。
- 接受任意 JSON value：拒绝；本 change只容忍已知 message/context两类诊断语义，不扩成无边界 payload contract。
- 新建 receipt writer CLI：拒绝；assigned append surface已存在，新增 command owner没有净简化。

### 4. Root-first feedback 与 control-path tests 是完成条件

Pair、queue 与 receipt继续使用现有 structured finding/dry-submit violation shape。每个 blocking root必须提供 direct `missing_fact`、现有授权 `write_to` 或 Engine operation、当前 checkpoint `rerun`，并在 prerequisite失败时 mask dependent symptoms。

测试首先证明：

- reduced coverage不会被误升级，`action:add` full-pair缺口会被同一 evaluator拒绝；
- inspect/formal Gate同源且 queue evaluator无副作用；
- receipt string/object合法而 identity/schema/JSONL仍 fail closed；
- Agent-facing guidance把机械修复留给 Agent且没有第二 authority。

不增加 controller-style E2E来证明 deterministic contract。

## Apply target manifest

| Control surface | Apply action | Net effect |
| --- | --- | --- |
| Wave2 pair facts | replace count-only and slug-presence checks with one normalized evaluator plus policy consumers | 用真实 structured fact替代两份弱 proxy；不扩大普通 coverage政策 |
| Wave completion queue | add one pure shared rule over existing QueueSchema | 新增 direct-authority handoff底线；不新增 state/CLI/inference |
| Runtime receipt schema | widen only optional `detail` to object/string | 降级 presentation-only blocker；identity authority不变 |
| Sub-agent guidance | replace log-as-receipt wording with receipt + optional log split | 删除一条 Agent必须猜测的隐含规则 |
| Checkpoint/reentry/trace | no new writer, field or authority | 避免 manifest/controller/trace decision layer |

## Risks / Trade-offs

- [普通 reduced coverage仍可能不满足 Agent quality depth] → 本 change不伪装能从现有 pair refs确定 contradiction/quality；保留 profile self-check，未来若要 Gate化先提出 structured checked-dimension contract。
- [v0.30 `action:add` bundle靠 slug/nonzero代理通过] → v0.31返回 exact missing pairs，Agent修复现有 finding-index后重跑；无 bypass。
- [Global queue quiescence阻止手工预装 future work] → 当前没有 accepted pre-enqueue path；这是清洁 handoff的保守底线。未来需求必须先显式定义 phase identity，不用 heuristic放宽。
- [Queue residual可能同时包含多类工作] → root precedence先清 in-flight，再按 active-front显式 target选择 owner；pool-only state暴露 missing contract，每次只给一个最近边界。
- [Topic rename或 legacy registry造成 pair token drift] → UID-bound topic用 UID；legacy topic用 evaluator-local canonical key；两者都接受 current/previous layout token并显示 current slug。
- [String detail降低结构化 diagnostics] → object仍推荐；detail不拥有 verdict，string只影响可读性，不影响 binding。

## Migration Plan

1. Apply前运行 verification-routing plan check，并以 focused compatibility/negative baselines锁定 reduced coverage、`action:add` proxy、queue residual与 string detail现状。
2. 实现 normalized pair evaluator，接入 general self-consistency与 `action:add` exact policy，删除 nonzero与 slug/text proxy checks。
3. 实现 shared queue quiescence rule并接入三份 Wave definitions/dispatcher/audit inventory。
4. 放宽 receipt detail并统一 generated/shared/role guidance。
5. 运行 focused unit/integration、完整相关 Wave/work-unit suites、workflow/package/hygiene/governance checks。
6. 更新 `CHANGELOG.md` 与 `DPT_FRAMEWORK/RUN.md` 到 v0.31。

Rollback以完整 revert v0.31 change为单位；没有 data migration、persistent schema version bump或双 success path需要清理。按 v0.31补齐的 pair/queue/receipt数据在旧版本仍是合法输入。

## Open Questions

无。若 apply 证明现有 topic-layout resolver不能无歧义解析 accepted pair token，必须保持 fail closed并回到 explore修订 contract；不得退回 slug substring、ledger regex或新增 pair identity state。
