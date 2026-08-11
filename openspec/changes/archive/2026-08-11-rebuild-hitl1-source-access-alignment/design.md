# HITL1 跨执行器来源取用对齐设计

## 结论与边界

HITL1 要解决的不是“这个 provider 有没有 `WebSearch`/`WebFetch`”，而是：**在当前
用户网络和当前 Coding Agent 已获许可的执行表面上，哪些中外典型公开页面可以直接
取得真实内容；这是否妨碍用户明确想要的来源。**

这是一个三个 owner 的短闭环：

```text
固定中外样本 + 当前执行器合法直接取页
  -> 一次紧凑、可替换的 observation
  -> Phase 以用户问题/约束判断相关性
  -> 仅 material gap 进入 HITL1 对齐
  -> 用户调整环境后重探，或接受最终范围
  -> 同一 HITL1 Gate -> silent research
```

它不把“用户使用中文”“执行地在中国”“VPN 已开启”或“当前是 Codex/Claude”当作研究
来源倾向或取用能力的事实。强语义输入仅为原始问题、显式 source constraint、命名的
站点/机构、must-answer 和 Topic map。任何一轮 observation 也不承诺后续网络稳定。

### 宪章评审

**Semantic precision。** 读者是完成 ordinary HITL1 decision 后的 Phase Agent。它得到的
有界问题是“这次真实的中外取用限制是否 material to 已确认研究语义”；不是“哪个国家
的用户”、不是“应否自动开 VPN”、也不是“这个 Agent 理论上支持什么”。必须分开保存
直接取页 observation、用户语义与 Gate verdict；当所有固定样本都有终态（或 round budget
诚实耗尽），且没有 material gap 或用户已给出最终决定，推理自然停止。

**Simple reliable control。** 删除 search query/candidate 阶梯、首成功短路、same-candidate
binding、provider selector 和 retry history。替代物是一份独立 controller 的固定 URL、一次
并发 round、每个样本一个终态，以及在用户真正调整环境后才发生的新 round。没有新 Gate、
轮询、后台 watcher、网络档案或默认重试次数。

**Helper-oriented Agent。** 用户只决定无法代理的语义/风险边界：是否调整其环境、修改
来源约束，或接受当前范围。Agent 在现有权限中执行完整 probe、记录结果、解释 material
gap 并恢复 Gate 机械步骤。Engine 只检查 observation 形状与既有 Gate；它不判断相关性、
VPN、网络位置或用户是否应该改变约束。

## Sample Controller

`DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-hitl1-research-access-envelope.md`
仍是唯一的 isolated probe controller，物理上独立于 adapter、Phase、brief 与 generic
probe guide。它不得有 run-bundle path、profile/Gate authority、provider selection、用户题目
或 evidence/cache instruction。

### 固定样本

所有 URL 是 capability-only public samples，与用户主题无关，且不进入 research evidence。
core sample 的 `content` 可说明对应来源组至少有一项实际可取；diagnostic sample 只补充
摩擦信息，不决定组可用性。

| Group | ID | URL | Role |
| --- | --- | --- | --- |
| China | `gov_cn` | `https://www.gov.cn/` | Core public-government page |
| China | `gitee` | `https://gitee.com/` | Core domestic code host |
| China | `xinhuanet` | `https://www.news.cn/` | Core domestic public-news page |
| China | `cnki_catalog` | `https://www.cnki.net/` | Diagnostic catalog only; never full-text proof |
| Overseas | `wikipedia` | `https://www.wikipedia.org/` | Core public reference |
| Overseas | `github` | `https://github.com/` | Core global code host |
| Overseas | `iana` | `https://www.iana.org/domains/reserved` | Core public standards/registry page |
| Overseas | `arxiv` | `https://arxiv.org/` | Core public scholarly page |
| Overseas | `rfc_editor` | `https://www.rfc-editor.org/` | Transport-only reserve public standards page |

The controller begins every ordinary round with all seven core samples. `cnki_catalog`
is considered only as a China diagnostic reserve; `rfc_editor` only as an overseas
transport reserve. A reserve may start only when its group has no core content,
transport remains inconclusive after confirmation, and round time remains. A CNKI
homepage success means only that its catalogue homepage is obtainable, never paper,
article, account, subscription, or full-text access.

### Executor-neutral Retrieval

The controller tells the probe to retrieve each fixed URL directly using one surface
that the **current executor** already exposes and permits. It records only the
semantic surface category (`native`, `browser`, `node_fetch`, or `curl`) when content
succeeds. It never names `WebSearch`, `WebFetch`, Codex, Claude, a model, a provider,
an environment variable, a launcher, or an operation priority.

Native/built-in, browser, Node, and shell access are not interchangeable permissions.
The probe selects only an actually legal action in its current host. A missing native
tool does not grant browser, Node, or shell access; a host-policy denial does not
become a user approval request. The controller requires direct content, not a
particular tool mechanism.

### Bounded Round

| Rule | Value | Rationale |
| --- | --- | --- |
| Primary sample deadline | 12 seconds | Quick observation without treating a slow path as globally absent. |
| Transport confirmation | One same-URL attempt, up to 30 seconds | Used only for DNS, connect, TLS, or first-byte uncertainty. |
| Global concurrency | At most 4 active sample retrievals | Small-batch parallelism without a serial ladder or a burst. |
| Per-group concurrency | At most 2 active retrievals | Ensures one group cannot crowd out the other. |
| Full-round budget | 90 seconds | Bounds a poor-network probe without manufacturing a hard network diagnosis. |
| Reserve samples | At most one per group | Only after unresolved transport uncertainty, never after policy/auth/challenge outcomes. |

At the start of a round, the controller schedules up to two pending core samples from
each group into the four retrieval slots. It uses a current-executor concurrent
facility only when that facility is already lawful; an executor without one stays
within the same group-balanced queue and 90-second budget rather than treating its
lack of concurrency as a website fact. No core success stops the other group. Each
sample has at most one primary direct attempt. Only a `transport_inconclusive`
terminal outcome qualifies for the one same-URL 30-second confirmation.
`login_required`, `challenge`, `http_denied`, and `rate_limited` do not qualify for
confirmation or blind retry. The controller makes no new launch after the 90-second
deadline and marks an individual known-but-unstarted sample as
`round_budget_not_attempted`; it records no attempt history or cancellation theory.

Terminal outcomes are closed: `content`, `login_required`, `challenge`,
`http_denied`, `rate_limited`, `transport_inconclusive`, `failed`,
`round_budget_not_attempted`, plus `not_attempted` for the whole no-request branch.
`not_attempted` is legal only when the isolated probe relay fails before any page
request, or the current executor exposes no already-permitted direct retrieval
surface: every declared sample then has that same outcome and the unavailable summary
states the direct reason. `round_budget_not_attempted` means an individual request
did not start before the round deadline; neither outcome says that its website is
unreachable. A command exit, empty body, search result/snippet, login page, error
page, or challenge shell is never `content`.

## Observation Contract

`rb_profile.yaml#research_access` remains the direct runtime fact. A fresh valid
round replaces its previous value. It is intentionally a compact final snapshot,
not an ever-growing access atlas.

```yaml
research_access:
  status: available # or unavailable
  probed_at: 2026-08-11T12:00:00.000Z
  sample_observations:
    - sample_id: gov_cn
      source_group: china
      outcome: content
      retrieval_surface: native
    - sample_id: wikipedia
      source_group: overseas
      outcome: transport_inconclusive
    # Every declared static sample has exactly one final compact entry.
```

`available` means one or more non-diagnostic core samples had real content;
`unavailable` means none did and carries a direct summary reason. The schema validates
that invariant, the closed sample set, one entry per sample, the ID/group pairing,
and the `content`-only surface rule. It accepts prior search/candidate-based branches
as **legacy read compatibility** but forbids mixing legacy and new fields in a single
observation. There is no URL, body, header, status code, candidate, query, raw tool
label, retry count, VPN state, geolocation, IP, or provider field.

No new access boundary is inferred from samples. A legacy `access_boundary` remains
readable and resolver-owned when present. The new observation's terminal outcomes are
facts for Phase semantic judgment, not an Engine diagnosis. A relay failure or absent
legal direct surface uses the complete new unavailable shape with every known sample
in its `not_attempted` form and a direct summary reason; it is not an available
synthetic fallback or a claim that any sample is unreachable.

## Phase Alignment

The controller is deliberately blind to the topic and controls. The Phase receives
the original research question, accepted must-answer, Topic map and controls, so it
alone can apply this decision table:

| Final observation | Semantic relevance | Phase action |
| --- | --- | --- |
| Any group outcome | No material gap | Record concise observation notice, then existing Gate. |
| Material group/sample limitation | User requests a new round after their own environment change | Stay at HITL1; run a new full round. The Agent neither verifies nor records the change. |
| Material group/sample limitation | User revises explicit source semantics | Apply the normal HITL1 update, then re-evaluate/reprobe only when needed. |
| Material group/sample limitation | User accepts current scope | Preserve literal acceptance in controls, keep truthful observation, then existing Gate. |
| Material group/sample limitation | No final user decision | Remain in the ordinary HITL1 conversation. |

This does not silently relax a hard source constraint. If the user accepts current
scope while retaining a hard constraint, both facts remain visible to research; the
Agent reports any inevitable coverage limitation rather than substituting prohibited
sources. A user may request multiple new rounds after their own environmental changes;
their new request is sufficient and the Agent neither verifies nor records the network
change. There is intentionally no numerical retry limit, but there is also no automatic
repetition without a new user response.

The existing controls snapshot receives at most one final prose amendment such as the
user's literal “按当前取用范围继续” or an approved source-semantics revision. It does
not copy the structured sample matrix, tool output, or previous rounds. `research_access`
is the sole structured observation owner. The Gate requires this observation to be
completed and schema-valid, not `available`: accessibility and material relevance are
not a deterministic admission truth. Phase is responsible for not invoking that Gate
until a material limitation has a user-resolved semantic outcome.

## Surface Changes

| Surface | Change |
| --- | --- |
| `shared-hitl1-research-access-envelope.md` | Rebuild as the standalone controller above. |
| `shared-hitl1-capability-probe.md` | Keep generic isolation/safety; require the controller, without search/fetch ladder duplication. |
| `host_tools/research-access-adapter.*` | Remove production Claude-only operation assumption; retain launcher/canary facts only and retain resolver logic only for validated legacy boundary facts. |
| `phase-hitl1.md` | Deliver only generic guide/controller, write final observation, run semantic access-alignment loop before the existing Gate. |
| `brief/hitl1.md` | Chinese observation and material-gap messages; no false availability, fixed retry count, or extra lifecycle checkpoint. |
| `shared-profile.md` | Explain direct-sample format, final-observation replacement, legacy boundary compatibility, and non-authority of sample outcomes. |
| `schema/enums.mjs`, `schema/contracts/profile.mjs` | Add closed direct sample vocabulary and strict current/legacy format distinction. |
| `check-gate-hitl1-recorded.mjs` | Require a completed valid observation, not `available`; remove selected-adapter unavailable feedback for new observations. |
| Case 115 and observer | Replace hard-coded production tool predicates with direct-sample protocol checks that derive any operation-event label only from the retained executor-scoped canary contract. |
| `semantic-fact-families.yaml` | Reframe `research.host-access-envelope` around current direct-sample observation plus only a validated legacy boundary. |
| `CHANGELOG.md`, `RUN.md` | Release `v0.86` with a bounded direct-observation claim only. |

`shared-page-fetch-guidance.md` remains a Wave work-unit contract. Its cache and
receipt obligations make it unsuitable for the HITL1 isolated probe, so this change
neither imports it into the controller nor duplicates a generic provider abstraction.

## Verification

Deterministic tests cover the closed schema truth table, legacy readability, the
no-request versus round-budget distinction, Gate non-admission by availability, Gate
rejection of missing/unprobed observations, controller/Phase/brief separation,
controller sample/timeout/concurrency declarations, controls amendment bounds, and
temporary-bundle loop behavior. Case 115 remains an optional real executor canary: its
adapter-scoped observer may use only that canary's actual operation-event metadata, it
may honestly be `NOT_RUN` or unavailable, and it proves only its retained actual
executor run. No fixture or canary establishes China or overseas egress, provider
support, permission, future access, or research coverage.

The exact Apply plan will update `tasks.md` immediately after every completed task or
actionable implementation finding, as requested by the user.
