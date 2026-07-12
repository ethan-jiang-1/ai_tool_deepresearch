## Context

当前 delegated work 的确定性 authority 已经集中在 queue demand、Engine-owned work-unit index/manifest/beacon/receipt/result/submit/ledger。缺口发生在 claim 之前：Phase Agent 按 bounded batch claim 多个 work units，然后才调用 host native Agent surface；若 host/model/account 返回 API 402，所有已 claim attempts 都在没有内容产出的情况下进入 fail/abandon/re-enqueue 清理链。

Engine 无法直接调用或认证 Codex/Claude Code 的 native spawn surface，也不应把 host account/model availability 变成新的框架 lifecycle state。Agent 能在当前 conversation/host 上执行一次小型真实 canary 并看到直接结果；Engine 能做的是在 claim mutation boundary 要求该 observation 显式化、验证 actor choice 组合、记录最小审计字段，并保持 work-unit submit authority不变。

现有manifest/index/beacon、runtime receipt、normalized result与submitted ledger已提供actor/provenance放置面。`_agent.json`与runtime refs已明确是diagnostic-only，不应为了本change升级成blocking authority。本change应扩展必要既有面，而不是创建actor registry、fallback queue、availability cache或新CLI family。

## Goals / Non-Goals

**Goals:**

- 在任何新 delegated work ID 分配前，先从queue-front建立role-homogeneous candidate plan并消费一次与planned role exact-bound的当前 actor observation；已知 unavailable/unknown 时保持 queue demand 未 claim。
- 为明确允许fallback的现有work-unit kind提供一个显式 `phase_agent_fallback`；未知/未来kind默认禁止，accepted fallback固定单work-unit且仍使用相同 envelope、receipt、dry-submit/formal submit 与 ledger。
- 让 result/ledger/inspect 能区分 native delegated execution 与 Phase Agent fallback，防止 fallback 冒充 subagent provenance。
- unavailable → available 后回到同一个 claim checkpoint，无 queue/index/ledger 手改或隐藏恢复。
- 保持最短闭环和 helper-oriented responsibility：Agent做 probe 与机械执行，Engine做组合/identity/submit verdict，用户只处理不可代理的 host/account/permission。

**Non-Goals:**

- 不保证 native probe observation 在 claim 后仍然有效，也不实现 native host adapter、余额查询、model discovery 或 account remediation。
- 不新增 persistent availability mode、TTL、lease、daemon、watcher、probe database、actor scheduler、fallback priority tree或自动 role/model switching。
- 不改变 queue schema、evidence floor、cache/reference/source contracts、topic state、gate routing、post-final reentry或 human override。
- 不允许把已 claim 的 `delegated_subagent` attempt 原地改成 fallback；actor class 对一个 work ID immutable。
- 不允许一个role observation授权不同role的queue demand，也不允许fallback沿用normal delegated batch并行数。
- 不把 trace/log observation 当未来 claim authority，不从 API 402 文本反向推断成功/失败状态。

## Decisions

### 1. 复用 `operate-work-unit claim` 作为唯一 preflight/mutation boundary

扩展 claim 参数，而不是新增 `probe-actor` CLI 或 availability service：

```text
operate-work-unit claim <bundle> --phase waveN --count N \
  --actor-outcome available|unavailable|unknown \
  --actor-source native_probe|not_observed \
  --actor-role-key <planned-role-key> \
  --actor-reason <normalized-reason-code> \
  --execution-actor delegated_subagent|phase_agent_fallback
```

Zod `ActorExecutionDecisionSchema` 负责跨字段组合：

| observation | requested actor | verdict |
|---|---|---|
| `available/native_probe` + exact role | `delegated_subagent` | existing bounded claim |
| `available` | `phase_agent_fallback` | reject/no mutation；normal claim |
| `unavailable` | `delegated_subagent` | no claim；single fallback only if queue-front kind policy allows, otherwise resolve host blocker |
| `unavailable` + exact role + allowed kind policy | `phase_agent_fallback` | claim exactly one fallback attempt |
| `unknown/not_observed` | either | no claim；one bounded native probe for planned role |
| role mismatch / invalid source-outcome pair | either | invalid/no mutation |

Claim先读取queue并构造一个不落盘的candidate plan。Normal actor从active window front开始，最多取requested count，遇到非eligible item、不同`targets.delegates.role_key`或invalid kind/role policy即停止；fallback actor从一开始effective count就是1，只preview queue-front单项，不让后续batch item过度阻塞当前fallback。Role key本身就是本change需要的actor surface identity，不再增加一个自由文本surface字段。没有eligible demand时保持现有empty-claim行为，不要求probe。存在candidate时，missing actor args归一为`unknown/not_observed`并no-claim。Invalid schema/role mismatch在任何trace/log前失败；valid no-claim增加稳定 `actor_preflight` block和一个 `recommended_action`，不创建work-unit directory、不推进queue/index batch counters；允许existing diagnostic trace/log owner写一条record。

**Alternatives considered:**

- 独立 probe CLI + token：会引入 token storage、expiry、replay与第二 checkpoint，拒绝。
- availability JSON registry/TTL cache：host truth 会快速变化，且形成新的全局 mode，拒绝。
- 继续先 claim 后 spawn：保留 BUG-077 的 doomed batch，拒绝。
- 对整个wave做一个通用probe：无法绑定实际queue role，可能让source-intake probe授权topic-scout demand，拒绝。

### 2. Host observation 是显式 Agent input，不伪装成 Engine-authenticated truth

Agent 必须先读取claim preview/queue-front delegated role，再用同一planned native role surface做一次小型canary（不搜索、不写evidence、不占用work-unit identity），然后把normalized observation传给claim。不存在独立、machine-readable的host-report authority，因此第一版不接受`host_report` source。Closed normalization matrix：

| outcome | source | reason |
|---|---|---|
| available | native_probe | probe_succeeded |
| unavailable | native_probe | probe_access_denied / probe_model_unavailable / probe_host_policy_blocked / probe_capacity_unavailable |
| unknown | not_observed | observation_required |
| unknown | native_probe | probe_inconclusive |

Generic tool crash、含糊错误或没有可分类direct fact只能是`probe_inconclusive`，不能触发fallback。Engine不保存raw API error、余额、credential、account detail，只保存：

```json
{
  "execution_actor_class": "delegated_subagent",
  "actor_observation": {
    "outcome": "available",
    "source": "native_probe",
    "role_key": "dpt-source-intake",
    "reason_code": "probe_succeeded",
    "recorded_at": "Engine time"
  },
  "fallback_from": null
}
```

`source`/`reason_code` 是审计分类，不是 permission。Engine验证observation role与candidate queue role一致，只声称“调用方在本次claim提交了这个observation，并据此选择actor class”，不声称独立验证host account truth。

Observation没有TTL/token/cryptographic freshness。`recorded_at`由Engine在claim invocation写入，只证明本次decision何时被记录；“是否刚刚真实观察”仍是Agent action responsibility。Phase guidance要求probe后立即claim，Engine不通过timer或历史trace猜freshness。

**Alternatives considered:**

- 解析 API 402 字符串：provider-specific、发生太晚、泄漏原始信息，拒绝。
- 让 Agent只在 Markdown中自律：无法在 claim mutation boundary 防止 doomed allocation，拒绝。

### 3. `phase_agent_fallback` 是 work-unit actor，不是 controller bypass

Fallback eligibility放在现有`DEFAULT_KIND_CONTRACTS`的窄`actor_policy`内，而不是queue item或profile。第一版明确决定：

| work-unit kind | accepted delegated role | Phase Agent fallback |
|---|---|---|
| `wave0_source_intake` | `dpt-source-intake` | allowed |
| `wave1_topic_deepening` | `dpt-evidence-extractor` | allowed |
| `wave2_targeted_evidence` | `dpt-topic-scout` | allowed |

Missing/unknown kind policy、kind/role mismatch一律prohibited。这样未来claim-verifier、synthesis-reviewer或其他需要actor separation的kind不会被全局fallback自动覆盖。Queue item不能自填/override policy；apply characterization只需验证这三个明确决定及default deny，不再把eligibility留到实现时临场决定。

Fallback 在 unavailable observation 下由 claim 显式分配一个新 work ID，effective count固定为1，即使requested count/free capacity更大。生成task/beacon时instruction audience改为Phase Agent，但任务、路径、nonce、output/cache contract不变。Phase Agent读取work-unit task并在assigned directory内执行，写真实receipt/result，然后调用existing dry-submit/formal submit；submit或terminalize后才可claim下一个fallback。

Actor class 写入一个共享 `actor_execution` object。为可靠区分“legacy缺actor事实”和“new claim漏字段”，不升级整套index/manifest schema版本，而是在现有schema family内增加一个discriminated子契约：`actor_contract_version: "work-unit.actor.v1"`。New index record/manifest/beacon/result/receipt/ledger必须带该literal；legacy branch必须完全缺少它。Manifest与index record是claim transaction内的direct authority并互相cross-check；beacon/inspect是projection，normalized result/runtime receipt/ledger是exact binding或derived audit。Status与agent schema不承载actor truth、无需变化。`_agent.json`/runtime refs继续只帮助forensics，submit不因其缺失、存在或形状差异而reclassify actor。

Manifest/index/beacon中的完整对象固定为：

```json
{
  "actor_contract_version": "work-unit.actor.v1",
  "actor_execution": {
    "execution_actor_class": "delegated_subagent | phase_agent_fallback",
    "delegated_role_key": "dpt-source-intake",
    "observation": {
      "outcome": "available | unavailable | unknown",
      "source": "native_probe | not_observed",
      "reason_code": "<closed enum>",
      "recorded_at": "<Engine datetime>"
    },
    "policy_decision": "normal_allowed | fallback_allowed",
    "fallback_from": null
  }
}
```

Fallback把`fallback_from`固定为`delegated_subagent`；normal固定为`null`。Result/receipt只重复`actor_contract_version`和`execution_actor_class`做identity binding；ledger保存完整snapshot。Queue demand仍保留`targets.delegates.to: sub-agent`与原role，因为那是intended demand，不是actual attempt actor。Actor object只属于work-unit attempt；不修改queue schema或task identity。

Submit仍从Engine claimed record派生authoritative actor class。任何conflicting result/receipt actor class都在ledger/queue mutation前失败；runtime refs不替代actor class，也不因presentation/diagnostic差异增加blocking rule。

**Alternatives considered:**

- Phase Agent直接写产物再由 queue complete：绕过 submit/provenance，拒绝。
- 把已有 claimed delegated attempt转换actor class：会重写 attempt identity/history，拒绝；必须terminalize并新 claim。
- 自动依次尝试多个role/model/main Agent：隐藏 fallback tree，拒绝。
- 在queue schema加`fallback_allowed`：让task author自授执行actor权限并制造第二policy owner，拒绝。
- fallback保持normal batch count：一个Phase Agent不能并行执行多个actor attempts，会重建doomed in-flight pile，拒绝。

### 4. Actor class 对 work ID immutable；probe 后失败走现有显式 recovery

Native probe成功后真实spawn仍可能因race、capacity或policy变化失败。本change不声称消除该race，也不新增`fail-preflight`或改写existing fail authority。若normally claimed attempt在任何`work_started` receipt或Engine-observed output/cache progress之前，以closed unavailable reason失败，Agent guidance的唯一恢复是运行existing `fail --reason actor_spawn_unavailable:<reason_code>`，然后fresh probe/new claim。`abandon`不作为这个failure shape的竞争选项。若已有progress，则继续existing inspect/repair/timeout-preflight，不自动fail、不in-place fallback。

这保持恢复形状为：

```text
same claim checkpoint before allocation
or
fail one zero-progress unavailable attempt -> fresh probe -> new legal claim
```

### 5. Legacy actor truth使用窄且诚实的 compatibility union

Schema reader通过显式legacy/actor-aware unions接受pre-v0.25 index record/manifest/beacon/result/receipt/ledger缺少actor sub-contract。Discriminator只看`actor_contract_version`，不看时间、mtime、trace或字段猜测。这些历史bytes证明work-unit transaction存在，但不可靠证明实际执行者；BUG-077本身就记录过Main Agent手工完成旧work unit。因此兼容projection必须是`execution_actor_class: legacy_unrecorded`与`actor_observation.source: legacy_claim, outcome: unknown`，绝不能推断`delegated_subagent`。

既有legacy claimed attempts可按legacy result/receipt contract inspect/submit；新ledger row写`actor_contract_version: "work-unit.actor.v1"`但actor class为`legacy_unrecorded`。已有submitted ledger rows通过legacy schema branch读取并在inspect中投影该值。只有legacy record可省略receipt/result actor class；任何v0.25 new normal/fallback claim必须exact actor binding。`legacy_unrecorded`不是new claim enum，也不能获得fallback permission。Read-only inspect、no-claim和successful new claim都不需要bundle-wide或index-container migration；legacy与actor-aware records可并存。

不做 bundle-wide migration命令或批量重写。新 claim只写新 shape，旧 attempt自然drain后兼容路径退出主流。

### 6. Queue与lifecycle保持原 owner

No-claim preflight不修改 `rb_queue.json` 或 `_work_units/_index.json`。Allowed normal claim继续调用现有queue/work-unit transaction与capacity计算；fallback复用同一transaction/capacity但effective count固定1，不获得单独capacity pool。Actor policy属于existing kind contract，不进入queue task、`rb_status.json`、profile、topic state或长期 lifecycle mode。

### 7. Agent-facing flow只暴露一个最近动作

- `unknown` → 对planned role做一次bounded native probe，再重跑claim。
- `unavailable + delegated_subagent + fallback allowed` → 用相同role-bound observation显式claim一个`phase_agent_fallback`。
- `unavailable + fallback prohibited` → 处理唯一external actor blocker后重跑normal claim。
- `available + fallback` → normal delegated claim。
- accepted fallback → Agent自己执行task/dry-submit/submit，不把命令推给用户。
- 只有host/account/permission必须由人处理且Agent不选择accepted fallback时，才向用户升级最小外部动作。

### 8. Paired Evolution Direction review

`evolution-simple-reliable-control`：新增一个Zod decision object、existing kind contract上的一个actor policy字段和既有claim的一次前置分支；复用existing claim trace events，避免独立CLI、host-report authority、new trace family、probe token、availability store、TTL、scheduler和fallback tree。删除的运行复杂度是doomed batch的`claim N → spawn N failures → fail/abandon N → re-enqueue N`。Role-bound preview防止一个probe越权覆盖mixed demand；fallback单attempt避免新的in-flight pile；zero-progress spawn failure固定一个fail route。

`evolution-helper-oriented-agent`：fallback permission来自accepted spec与validated claim组合，不来自`human-directed`。Agent执行probe、claim、fallback work与submit；Engine裁决；用户只处理外部不可代理动作。Change不会把普通命令转交给用户，也不会让Agent伪造host或subagent authority。

## Risks / Trade-offs

- **[Agent可能错误报告 observation]** → Engine明确不声称host认证；组合与actor provenance仍可审计。Controlled proof验证no-mutation/provenance，不伪造host真实性证明。
- **[Probe与spawn之间发生availability race]** → actor class immutable；使用现有terminalization后fresh observation/new claim，不引入自动转换。
- **[Fallback降低并行度并增加Phase Agent context压力]** →fallback effective count固定1，submit/terminalize后才claim下一个；不改变evidence floor。
- **[Fallback破坏需要独立actor的kind]** →actor policy由existing kind contract逐kind声明，unknown/default prohibited；queue item/human-directed不能override。
- **[一个probe误授权不同role]** →claim先构造homogeneous candidate prefix并exact-match observation role；不同role需要fresh observation。
- **[调用方重放旧observation]** →不引入TTL/token；Engine只审计invocation input，phase guidance要求probe后立即claim，trace不授权future claim，设计不夸大machine-authenticated freshness。
- **[Fallback让queue target与实际actor看似冲突]** →queue保留intended delegated demand，manifest/index/ledger记录actual actor与`fallback_from`；两层语义明确且不双写同一事实。
- **[新必填claim参数影响旧调用]** →无eligible demand保留existing empty behavior；有demand但missing observation归一为unknown并给one-action；apply更新active phase/playbook/tests，legacy claimed/ledger bytes保留truthful compatibility。
- **[Actor字段扩散到多个work-unit surfaces]** →只在manifest/index保存direct authority，beacon/result/receipt/ledger做必要projection/binding；agent/status不升级，static test锁定不得出现第二actor owner。
- **[Trace被误用为availability cache]** →复用existing claim events且字段diagnostic-only；claim无当前显式observation即fail closed。
- **[Phase Agent fallback被误认为native subagent]** →receipt/result/ledger exact actor binding；runtime refs保持diagnostic-only，不能重分类actor。

## Migration Plan

1. Apply阶段先登记 `DEW-016..018`、`AGQ-024`、`RWP-019`、`SRL-006`，建立legacy/new characterization。
2. 为三个现有production kind写入上述role/fallback policy，unknown/default deny；增加`work-unit.actor.v1`子契约、显式legacy/actor-aware unions、共享actor evaluator与`legacy_unrecorded` projection。
3. 增加role-homogeneous claim preview，将参数/preflight放在任何allocation、batch counter或trace-invalid-input mutation之前；successful claim只创建actor-aware new record，不迁移legacy records/container。
4. 扩展receipt/result的最小version/class binding、ledger full actor snapshot与inspect/submit validation；不修改queue schema。
5. 更新Wave0/Wave1/Wave2/shared guidance、COMMANDS与一个work-unit actor playbook。
6. 在现有 `exp_engine-boundary` family 增加light case-407：unavailable no-claim零mutation、fallback formal submit、ledger actor class、later available normal claim。
7. 跑focused/full regression、OpenSpec/governance checks，更新v0.25 changelog/banner与BUG-077/overall roadmap状态。

Rollback：在archive前可整体回退new claim fields/evaluator/guidance，但旧framework不保证读取actor-aware records，因此rollback前必须submit或terminalize全部`work-unit.actor.v1` normal/fallback attempts并确认无nonterminal actor-aware record。无需index migration rollback；不得把fallback record降格为`legacy_unrecorded`，也不得把legacy bytes升级猜测为delegated actor。

## Open Questions

- 无 apply-blocking open question。第一版固定两个actor class和两个observation source；新增provider/model fallback、machine-authenticated host token或并发actor pool必须另提change。
