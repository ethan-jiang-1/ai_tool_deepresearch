# 7 Topic 一次并发 7 个 Sub-Agent 的可行性调查

> 调查: 2026-08-09 | 来源: `dpt_rb_mature-open-source-deep-research-harness` run（7 topic 分两批 5+2 跑）
> 初始判断: **Engine 接受一次 `claim --count 7`，而 `5` 是 Agent-facing 保守默认，当前没有结构化 cap 配置位。**
> 2026-08-10 当前源码核验补充了完整前提、Wave2 边界和 host 证据限制，见文末；不能把 Engine 的输入接受误读为已证明的七个物理并发执行者。
> 当前状态: `active`（2026-08-10 重新开启）。调查已完成；下一步是以一个结构化 delegated-concurrency ceiling 取代固定保守默认，候选默认上限为 12。

## 问题

7 个 topic 的 Wave0/Wave1 delegated sub-agent 工作时，为什么实际分两批（5+2），
不能一次并发 7 个？这是不是 bug？能不能做成一次 7 个？

## 结论（先说）

**不是 bug，且完全可以一次 7 个。**

- **Engine 层无并发上限**：`operate-work-unit claim` 只校验 `--count` 是正整数
  （`work-unit-lifecycle.mjs:531`），`previewClaimCandidates`
  （`work-unit-lifecycle.mjs:401`）按 requestedCount 顺序取 active_window 的
  item，仅当 role 不一致或 kind 不匹配时截断。7 个同 role item 会被一次 claim 全部。
- **cap 5 是文档层保守默认**：`phase-wave0.md` §3.2、`phase-wave1.md` §3.2、
  `shared-subagent-protocol.md` §3 都写 "conservative default cap no higher than
  5 when no accepted profile/runtime cap exists"。这是给 Agent 的 guidance，不是
  Engine 强制。
- **本次 run 用了默认 5**，因为未设置任何 cap。7 个 topic 因此分两批。

## 证据

### 1. Engine claim 无 cap

`engine/work-unit-lifecycle.mjs`：
- 531 行：`if (!Number.isInteger(requestedCount) || requestedCount < 1) throw` —— 只验下限
- 401-426 行 `previewClaimCandidates`：`for (index < effectiveCount)` 顺序取
  active_window，`roleKey !== plannedRoleKey` 才 break；同 role 就全 claim

实测：本 run 中 `--count 5`（wave0、wave1）与 `--count 3`（wave1 supplementary）
均成功，Engine 未报任何 cap 上限错误。同 role 的 7 个 topic item 若 `--count 7`，
按代码会全部 claim。

### 2. cap 5 只在 Markdown

| 来源 | 原文 |
|------|------|
| `phase-wave0.md` §3.2 | "accepted/default cap for the run, **conservatively no higher than 5** when no accepted profile/runtime cap exists" |
| `phase-wave1.md` §3.2 | "The conservative default cap is **no higher than 5**" |
| `shared-subagent-protocol.md` §3 | "Use an explicit profile/runtime cap when accepted; otherwise use the documented conservative default cap for the phase, **no higher than 5**" |

三处都是 guidance，无 Engine 执行。

### 3. 无结构化 cap 配置位

- `profile.mjs`（ProfileSchema）**无 cap/concurrency 字段**
- 无 `--cap` CLI flag、无 env var、无 profile key
- "accepted profile/runtime cap" 在文档里是口子，但**没有落地的配置机制**
  → 要并发 7，只能 Agent 运行时自行 `--count 7`（Engine 不拦）

## 为什么默认保守取 5（而非 7）

cap 5 的意图是控制风险，不是技术限制：
- **宿主容量**：一次 spawn 太多 sub-agent 可能打满 host 并发/上下文
- **超时风险**：同时 run 的 attempt 越多，单个 attempt 的 timeout（默认 600000ms）
  被共享资源拖慢的风险越高
- **噪声隔离**：delegated work 的 receipt/trace 噪声随 in-flight 数增长
- 这些是**经验性保守值**，不是对特定 host 的硬测量

## 怎么做成一次 7 个

既然 Engine 不拦，两条路：

1. **Agent 运行时直接 `--count 7`**（推荐，零改动）：只要 7 个 item 同 role、
   Engine admission 全过，就一次 claim 7。成本是宿主同时跑 7 个 sub-agent。
2. **如果希望它成为"默认"而非每次手动**：需要一个 OpenSpec change，把
   "accepted profile/runtime cap" 落地为结构化字段（如
   `rb_profile.yaml#/delegated_concurrency_cap`），让 phase guidance 读它而非
   硬编码 ≤5。**当前不存在这个字段**——这也是一个文档/配置 gap（见下）。

## 顺带发现：cap 配置机制缺失（潜在 bug/改进）

文档说 "use an explicit profile/runtime cap when accepted"，但 profile schema、
CLI、env 都无此配置位。结果是：
- Agent 想调高并发只能靠"违反文档默认"手动 `--count 7`
- Agent 想调低（如弱 host 只跑 2 个）也没有结构化方式，只能自行判断

这不是 blocking bug，但属于 **"文档承诺了不存在的配置位"** 的 contract gap，
值得一个 OpenSpec change 落地（字段 + phase guidance 读取）。

## 与本次 run 实际阻塞的关系

**并发上限 5 不是本次 run 爆掉的原因。** 真正阻塞 Wave1 gate 的是 Engine 缺陷链
（见 `_backlog/bugs/` BUG-212/213/214）：
- BUG-213（depth-review 拒 prior source_ref）→ 误判需 supersede
- BUG-214（supplementary task.md 空 output vs dry-submit 强制非空）
- BUG-212（supersede 后 bypass 误报）→ gate 硬阻塞

并发分批（5+2）本身运行正常，sub-agent 全部成功提交。

## 参考

- `DEEP_RESEARCH_HARNESS/engine/work-unit-lifecycle.mjs`（claim 无 cap）
- `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md` §3.2
- `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md` §3.2
- `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md` §3
- `DEEP_RESEARCH_HARNESS/schema/contracts/profile.mjs`（无 cap 字段）

## 2026-08-10 当前源码核验（HEAD `4e4b0371b`）

> 本节只核验当前已接受的 OpenSpec、可执行代码、CLI/schema 和现有测试；它不重写上面的历史事故叙述。`dpt_rb_mature-open-source-deep-research-harness` 在本文只以裸名称出现（第 3 行），没有提供可选定的绝对 run bundle、receipt、trace 或宿主启动记录。因此上文关于该 run 的 `5+2`、"全部成功提交"、以及实际 host 同时启动数量的陈述，仍是**未经本次当前源码核验的历史 run 主张**，不能由下列静态/fixture 测试替代。

### 结论边界

- **Engine 输入层：可以。** `operate-work-unit claim --count 7` 被 CLI 当作 string `count` 传入，生命周期只拒绝非正整数，没有上限校验（`DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs:93-132`; `DEEP_RESEARCH_HARNESS/engine/work-unit-lifecycle.mjs:521-534`）。在 seven-item 的同 role、可 admission 的 `active_window` 前缀上，通用 claim owner 会创建至多七个 work unit；它不是按 Wave 写的单独 allocator（`DEEP_RESEARCH_HARNESS/engine/work-unit-lifecycle.mjs:339-343,401-426,715-824`；已接受的 `openspec/specs/agent/subagent-dispatch/spec.md:36-53`）。
- **当前正常流程：不能把上面的 Engine 事实等同于 "零改动推荐一次跑 7"。** 已接受的 `agentic-queue` spec 要求 Wave0/Wave1 的 Phase Agent 用 accepted profile/runtime cap，或在不存在该 cap 时使用保守的 documented default（不高于 5），并将 count 作为补足空闲 capacity 的值（`openspec/specs/agent/agentic-queue/spec.md:792-825`）。`subagent-dispatch` 也将 cap 定义为 Main Agent 的 claim-count 选择与 accepted cap，而不是 Engine 新 scheduler（`openspec/specs/agent/subagent-dispatch/spec.md:55-71`）。所以当前 Engine 会接受 7，不代表在没有一个被接受、可记录的 >=7 cap 时，Phase guidance 已授权把它作为默认/正常 drain。
- **不存在当前结构化 cap owner。** `ProfileSchema`、profile template、`operate-work-unit` 的完整 option 表和相关 host env helper 均没有 delegated-concurrency/cap 字段、flag 或环境输入（`DEEP_RESEARCH_HARNESS/schema/contracts/profile.mjs:63-103`; `DEEP_RESEARCH_HARNESS/rb_templates/rb_profile.yaml.tmpl:1-18`; `DEEP_RESEARCH_HARNESS/cli/operate-work-unit.mjs:93-112`; `DEEP_RESEARCH_HARNESS/host_tools/lib/env-deepseek.mjs:63-97`）。旧 `MAX_CONCURRENT_SUBAGENTS` 还被 hygiene rule 显式标为移除的 relay cap（`DEEP_RESEARCH_HARNESS/cli/validate-work-unit-hygiene.mjs:48-64`）。本次 scoped source search 没有找到另一个 Engine/CLI/schema 的确定性 owner。

### 共用 claim 机制与非 cap 阻塞条件

`claimWorkUnits` 是 Wave0/Wave1/Wave2 的同一 owner；`--phase waveN` 只解析 wave 编号（`DEEP_RESEARCH_HARNESS/engine/work-unit-lifecycle.mjs:316-319,521-534`）。对 `--count 7`，以下任一事实都可使结果少于七或零，而不是 "并发 cap"：

1. 七个 item 必须是 `active_window` 的连续前缀、目标为 `sub-agent`、wave 相同、role_key 与第一个一致；`refill_pool` 不会被 preview 直接跨越（`DEEP_RESEARCH_HARNESS/engine/work-unit-lifecycle.mjs:339-343,401-426`）。active window 的确定性上限是 20，故 7 本身可容纳，但它不同于 delegated concurrency cap（`DEEP_RESEARCH_HARNESS/schema/contracts/queue.mjs:9`; `DEEP_RESEARCH_HARNESS/engine/queue-manager-core.mjs:155-159`）。
2. 每个 candidate 都必须通过 admission；未知 kind、Wave1 错误 producer rule、非 canonical/mismatched topic binding、未知 finding 或 assignment-contract 错误会使 preflight 失败且不分配该 batch（`DEEP_RESEARCH_HARNESS/engine/helpers/queue-demand-admission.mjs:94-140`; `DEEP_RESEARCH_HARNESS/engine/work-unit-lifecycle.mjs:429-454,552-567`）。
3. 当前 role-bound actor observation 必须允许 normal delegated claim；unknown/unavailable、role mismatch 或 kind actor-policy mismatch 都不会分配。`phase_agent_fallback` 即使请求 7 也被硬性降为 1（`DEEP_RESEARCH_HARNESS/engine/work-unit-actor.mjs:98-120`; `DEEP_RESEARCH_HARNESS/engine/work-unit-lifecycle.mjs:576-686`）。
4. 写入前还会复查 queue/index snapshot；前缀漂移、index 漂移或同一 queue item 已在 `delegated_in_flight` 会中断交易（`DEEP_RESEARCH_HARNESS/engine/work-unit-lifecycle.mjs:489-518,715-730`）。当前 Engine 会报告 in-flight 数量，但这段 owner 没有读取 profile/runtime cap 来限制 normal claim。

### Wave0 / Wave1 / Wave2 比较

| Wave | Claim candidate / admission | 当前 cap guidance 的 authority | 结构化 cap 与实际 host spawn 证据 |
| --- | --- | --- | --- |
| Wave0 | 共享 contiguous-prefix 规则；phase loop 的 queue-front role 是 `dpt-source-intake`（`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md:128-152`）。非 Wave2 kind 要求 current canonical topic binding（`DEEP_RESEARCH_HARNESS/engine/helpers/queue-demand-admission.mjs:42-71,94-105`）。 | 已接受 spec 明确覆盖 Wave0：无 accepted profile/runtime cap 时 default 不高于 5；phase text 重述相同 top-up 规则（`openspec/specs/agent/agentic-queue/spec.md:792-819`; `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave0.md:130-143`）。 | 无 Wave0-specific schema/flag/env owner。claim 只返回 prompt refs；没有当前 run 证明七个 native actors 同时启动。 |
| Wave1 | 共享 prefix/role/admission；phase loop 的 role 是 `dpt-evidence-extractor`，另有 `wave1_topic_deepening` 必须使用 `producer_rule: topic_deepening` 的 admission 条件（`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md:133-143`; `DEEP_RESEARCH_HARNESS/engine/helpers/queue-demand-admission.mjs:100-105`）。 | 已接受 spec 同样明确覆盖 Wave1，phase text 写出 default 不高于 5（`openspec/specs/agent/agentic-queue/spec.md:792-819`; `DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave1.md:133-143`）。 | 无 Wave1-specific schema/flag/env owner，也没有实际七路 host fan-out 的 current-source/run evidence。 |
| Wave2 | 共享 prefix/actor/transaction owner；targeted-evidence loop 当前示例使用 `dpt-topic-scout`，但 phase frontmatter 列出两个可 delegated roles（`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave2.md:7-23,177-195`）。`wave2_targeted_evidence` 可无 topic binding；给出 topic/finding 时仍需通过相应 canonical/known-finding 检查（`DEEP_RESEARCH_HARNESS/engine/helpers/queue-demand-admission.mjs:42-86,94-140`）。 | Wave2 phase 要求 accepted/default-cap top-up，并 `requires` shared protocol；shared protocol 给所有 delegated queue demand "no higher than 5" 的无显式 cap 默认（`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave2.md:13-18,177-185`; `DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md:58-79`）。本次没有发现像 Wave0/Wave1 那样、在 accepted `agentic-queue` spec 中单独写出的 Wave2 numeric default。 | 无 Wave2-specific structured cap。现有 Wave2 test 还明确断言已删除旧 `max_gapfill_subagents_per_round` frontmatter，不能把归档时代的字段当作当前配置（`tests/integration/md/phase-wave2-queue-loop.test.mjs`, 本次测试结果见下）。没有 seven-host simultaneous spawn evidence。 |

因此三者的**deterministic claim**共享一个机制；区别在 queue-demand admission 和 phase role/guidance，而非存在一个 Wave-specific Engine concurrency cap。

### 实际 host spawn 与历史 run 证据

当前 production dispatch 的定义是 Engine claim 加 prompt handoff：Engine 写 envelope、移动 queue demand 并返回 Main Agent *may hand to* sub-agent 的 prompt（`openspec/specs/agent/subagent-dispatch/spec.md:5-7,18-28,36-40`；`DEEP_RESEARCH_HARNESS/engine/work-unit-lifecycle.mjs:794-810`）。shared protocol 指示 Phase Agent 对每个 returned work ID 启动一个 matching native Sub-agent，但同时明说这不认证 physical actor、也不证明 host/sub-agent liveness（`DEEP_RESEARCH_HARNESS/workflows/nodes/shared/shared-subagent-protocol.md:75-83`；Wave2 亦重复该边界，`DEEP_RESEARCH_HARNESS/workflows/nodes/phases/phase-wave2.md:191-195`）。

可执行的 experiment supervisor 确实会为一个 Playbook Agent 调用 `spawn`，但其 selected-case loop 是顺序循环，且它不消费 production work-unit prompt refs（`DEEP_RESEARCH_HARNESS/host_tools/run-agent-experiment.mjs:397-402`; `DEEP_RESEARCH_HARNESS/host_tools/lib/agent-experiment-supervisor.mjs:444-481`）。它既不是七个 production work unit 的 host scheduler，也不是上述 historical run 的证据。现有 claim regression 只验证 two-item batch（`tests/engine/work-unit-claim.test.mjs:112-150`），没有 seven-item 成功或 simultaneous host-spawn case。

### 已运行的现有验证

```bash
node --test tests/engine/work-unit-claim.test.mjs tests/engine/work-unit-actor.test.mjs tests/integration/cli/operate-work-unit.test.mjs tests/integration/md/phase-wave0-queue-loop.test.mjs tests/integration/md/phase-wave2-queue-loop.test.mjs tests/integration/md/work-unit-actor-guidance.test.mjs tests/schema/contracts/profile.test.mjs
```

结果：**100 tests / 11 suites passed**（27.6s）。这覆盖 shared claim、actor fallback=1、CLI admission/transaction preflight、Wave0/Wave2 guidance 和 profile schema；它不证明 `--count 7` 的真实 native fan-out，更不证明某个 historical run 的同时 host spawning。

### 有界建议（不实施）

不要将上文的“运行时直接 `--count 7`（推荐）”当作当前 supported default。若目标是正式支持/记录 seven-way fan-out，应先走一个 OpenSpec change：确定唯一的 structured profile/runtime cap owner 与验证/解析路径，使三段 phase guidance 对齐，并增加真实 `agent_flow_e2e` 证据（七个实际 host launch identities 与可重叠生命周期记录）。若目标只是判断历史 `5+2` run，先提供该 run 的 canonical absolute bundle 和宿主启动证据；在此之前保持其实际并发与提交结论为未验证。

## 重新开启：按已知 demand 提议批量 claim

调查确认的 gap 不是“Engine 意外拒绝 7”，而是 Phase Agent 没有一个可记录的、可改变的
并发 ceiling，因而只能使用固定的保守 `<= 5` guidance。该计划现重新开启以修复这个
控制模型。

目标行为是：当某个 wave 的 native Sub-agent actor 可用，且 queue 已知有 `N` 个独立、
eligible、同 role 的 delegated demand 时，Phase Agent 应提出并使用：

```text
claim_count = min(N, effective_delegated_concurrency_cap, remaining_free_capacity)
```

其中 `effective_delegated_concurrency_cap` 是唯一的结构化 control。当前拟议的默认 ceiling
为 **12**：N 为 7 时提出 7，N 为 15 时最多提出 12；已有 in-flight work 时仍必须先扣除
它占用的 capacity。它不跳过现有 contiguous queue-front、admission、role-bound actor
observation、transaction drift 或 fallback=1 的 Engine 约束，也不把 claim 数量表述为物理
host 并发的证明。

`12` 是待 OpenSpec proposal 评估和接受的默认策略，不是本次静态核验已经证明的宿主容量。
下一步应提出一个有界 change，确定该 control 的 schema owner、默认/override precedence、
Wave0/Wave1/Wave2 targeted-evidence 的共同读取路径，以及与 Engine claim 结果匹配的回归和
真实 Agent-flow 证据。
